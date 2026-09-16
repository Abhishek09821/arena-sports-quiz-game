import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomCode, playerName, playerToken } = body;

    if (!roomCode || !playerName || !playerToken) {
      return NextResponse.json({ error: "Missing required player data" }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: true, mock: true });
    }

    // 1. Find room
    const { data: room } = await adminClient
      .from("game_rooms")
      .select("id")
      .eq("code", roomCode.toUpperCase())
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // 2. Insert or update player in game_players
    const { data: player, error } = await adminClient
      .from("game_players")
      .insert({
        room_id: room.id,
        display_name: playerName,
        player_token: playerToken,
        score: 0,
        connected: true,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[Multiplayer Player Join warning]:", error);
    }

    return NextResponse.json({
      success: true,
      playerId: player?.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { roomCode, playerToken, score = 0, correctCount = 0, wrongCount = 0, status } = body;

    if (!roomCode) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: true, mock: true });
    }

    // Find room
    const { data: room } = await adminClient
      .from("game_rooms")
      .select("id")
      .eq("code", roomCode.toUpperCase())
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // If status is given (e.g. 'live' or 'finished'), update room
    if (status) {
      await adminClient
        .from("game_rooms")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", room.id);
    }

    // Update player score if playerToken provided
    if (playerToken) {
      await adminClient
        .from("game_players")
        .update({
          score,
          correct_count: correctCount,
          wrong_count: wrongCount,
        })
        .eq("room_id", room.id)
        .eq("player_token", playerToken);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
