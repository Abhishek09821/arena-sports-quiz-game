import { getOptionalUser } from "@/lib/auth/server_auth";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const auth = await getOptionalUser(req);
    if (!auth.userId) return NextResponse.json({error:"Sign in to create a room."},{status:401});
    const body = await req.json();
    const { code, hostName = "Host", sport = "All Sports", difficulty = "Mixed", count = 10, decade = "all", tournament, questions = [], playerToken } = body;

    if (!code) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({error:"Database unavailable. Room was not created."},{status:503});
    }

    const roomCode = code.toUpperCase();

    // 1. Create or upsert room record in game_rooms
    const { data: room, error: roomError } = await adminClient
      .from("game_rooms")
      .insert(
        {
          code: roomCode,
          created_by: auth.userId,
          mode: "buzzer",
          status: "waiting",
          settings: {
            hostName,
            hostToken: playerToken,
            sport,
            difficulty,
            count,
            decade,
            tournament,
            questions,
          },
          current_round: 0,
          updated_at: new Date().toISOString(),
        }
      )
      .select("id, code, status, settings")
      .single();

    if (roomError || !room) {
      console.error("[Multiplayer Room Create Error]:", roomError);
      return NextResponse.json({ error: roomError?.message || "Failed to create room" }, { status: 500 });
    }

    // 2. Insert host into game_players (clear any stale players for fresh room)
    if (playerToken) {
      await adminClient.from("game_players").delete().eq("room_id", room.id);

      await adminClient.from("game_players").insert({
        room_id: room.id,
        display_name: hostName,
        player_token: playerToken,
        score: 0,
        connected: true,
      });
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("[Multiplayer Room Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Database client not available" }, { status: 503 });
    }

    const roomCode = code.toUpperCase();

    // Fetch room
    const { data: room, error } = await adminClient
      .from("game_rooms")
      .select("*")
      .eq("code", roomCode)
      .maybeSingle();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Fetch registered players
    const { data: players } = await adminClient
      .from("game_players")
      .select("id, display_name, score, connected, player_token, created_at")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      success: true,
      room,
      questions: room.settings?.questions || [],
      settings: room.settings,
      sport: room.settings?.sport || "All Sports",
      difficulty: room.settings?.difficulty || "Mixed",
      hostName: room.settings?.hostName || "Host",
      hostToken: room.settings?.hostToken || null,
      players: players || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching room" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await getOptionalUser(req);
  if (!auth.userId) return NextResponse.json({error:"Sign in first"},{status:401});
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({error:"Database unavailable"},{status:503});
  const {code,status} = await req.json();
  if (!["live","finished"].includes(status)) return NextResponse.json({error:"Invalid status"},{status:400});
  const {data,error} = await db.from("game_rooms").update({status,updated_at:new Date().toISOString()}).eq("code",code).eq("created_by",auth.userId).select("id").maybeSingle();
  return NextResponse.json(error || !data ? {error:"Room update failed"}:{success:true},{status:error||!data?403:200});
}
