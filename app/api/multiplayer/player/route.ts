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
      .select("id, status, settings")
      .eq("code", roomCode.toUpperCase())
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ error: "Room not found. Please verify the code." }, { status: 404 });
    }

    // 2. Query existing players for this room
    const { data: existingPlayers } = await adminClient
      .from("game_players")
      .select("id, player_token, display_name, score, connected")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    const players = existingPlayers || [];

    // 3. Deduplication: Check if player is ALREADY in the room (reconnecting / reloading)
    const existingPlayer = players.find((p) => p.player_token === playerToken);
    if (existingPlayer) {
      await adminClient
        .from("game_players")
        .update({ connected: true, display_name: playerName })
        .eq("id", existingPlayer.id);

      return NextResponse.json({
        success: true,
        playerId: existingPlayer.id,
        isHost: players[0]?.player_token === playerToken,
        role: players[0]?.player_token === playerToken ? "host" : "guest",
        roomStatus: room.status,
      });
    }

    // 4. Strict 1v1 Capacity check: if not already a member and room already has 2 players
    if (players.length >= 2) {
      return NextResponse.json(
        { error: "This 1v1 room is full (maximum 2 players). Please create or join another room." },
        { status: 403 }
      );
    }

    // 5. Check if room is already completed
    if (room.status === "finished") {
      return NextResponse.json(
        { error: "This match has already completed." },
        { status: 403 }
      );
    }

    // 6. Insert new player (Guest / Player 2)
    const { data: newPlayer, error: insertError } = await adminClient
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

    if (insertError) {
      return NextResponse.json({ error: insertError.message || "Failed to join room" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      playerId: newPlayer?.id,
      isHost: false,
      role: "guest",
      roomStatus: "waiting",
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
    const { roomCode, playerToken, score, correctCount = 0, wrongCount = 0, status, currentRound, connected } = body;

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

    // If status or currentRound is given, update room
    const roomUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) {
      // Strictly conform to DB constraint: check (status in ('waiting','live','finished'))
      const normalizedStatus = status === "playing" ? "live" : status;
      if (["waiting", "live", "finished"].includes(normalizedStatus)) {
        roomUpdates.status = normalizedStatus;
      }
    }
    if (typeof currentRound === "number") roomUpdates.current_round = currentRound;

    if (Object.keys(roomUpdates).length > 1) {
      await adminClient.from("game_rooms").update(roomUpdates).eq("id", room.id);
    }

    // Update player state if playerToken provided
    if (playerToken) {
      const playerUpdates: Record<string, unknown> = {};
      if (typeof score === "number") playerUpdates.score = score;
      if (typeof correctCount === "number") playerUpdates.correct_count = correctCount;
      if (typeof wrongCount === "number") playerUpdates.wrong_count = wrongCount;
      if (typeof connected === "boolean") playerUpdates.connected = connected;

      if (Object.keys(playerUpdates).length > 0) {
        await adminClient
          .from("game_players")
          .update(playerUpdates)
          .eq("room_id", room.id)
          .eq("player_token", playerToken);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("code")?.toUpperCase();
    const playerToken = searchParams.get("token");

    if (!roomCode || !playerToken) {
      return NextResponse.json({ error: "Missing room code or player token" }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: true, mock: true });
    }

    // Find room
    const { data: room } = await adminClient
      .from("game_rooms")
      .select("id, settings")
      .eq("code", roomCode)
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ success: true, message: "Room already closed." });
    }

    // Find players to determine if this player is the creator (first player)
    const { data: players } = await adminClient
      .from("game_players")
      .select("id, player_token")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    const playerList = players || [];
    const hostToken = (room.settings as { hostToken?: string } | null)?.hostToken;
    const isCreator = hostToken ? hostToken === playerToken : playerList[0]?.player_token === playerToken;
    const shouldDisband = searchParams.get("disband") === "true";

    if (isCreator || shouldDisband || playerList.length <= 1) {
      // Creator leaves, disband requested, or last remaining player leaves -> delete room completely
      await adminClient.from("game_players").delete().eq("room_id", room.id);
      await adminClient.from("game_events").delete().eq("room_id", room.id);
      await adminClient.from("game_rooms").delete().eq("id", room.id);
      return NextResponse.json({ success: true, roomClosed: true, role: isCreator ? "creator" : "guest" });
    } else {
      // Guest leaves -> only remove this guest, room remains active for host
      await adminClient
        .from("game_players")
        .delete()
        .eq("room_id", room.id)
        .eq("player_token", playerToken);

      await adminClient
        .from("game_rooms")
        .update({ status: "waiting", updated_at: new Date().toISOString() })
        .eq("id", room.id);

      return NextResponse.json({ success: true, roomClosed: false, role: "guest" });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
