import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionId,
      score = 0,
      accuracy = 0,
      correctCount = 0,
      wrongCount = 0,
      bestStreak = 0,
      totalTimeSeconds = 0,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (adminClient) {
      // 1. Update session status
      const { data: session } = await adminClient
        .from("quiz_sessions")
        .update({
          status: "completed",
          score,
          accuracy,
          correct_count: correctCount,
          wrong_count: wrongCount,
          best_streak: bestStreak,
          total_time_seconds: totalTimeSeconds,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select("user_id")
        .maybeSingle();

      // 2. If user exists, update their profile stats
      if (session?.user_id) {
        try {
          await adminClient.rpc("increment_profile_stats", {
            p_user_id: session.user_id,
            p_score: score,
          });
        } catch {
          // If RPC not present, direct update
          await adminClient
            .from("profiles")
            .update({
              total_score: score,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.user_id);
        }
      }
    }

    return NextResponse.json({ success: true, sessionId, status: "completed" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
