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

    // If there are now 2 players, update room status to 'ready'
    await adminClient
      .from("game_rooms")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", room.id);

    return NextResponse.json({
      success: true,
      playerId: newPlayer.id,
      isHost: false,
      role: "guest",
      roomStatus: "ready",
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
    if (status) roomUpdates.status = status;
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
