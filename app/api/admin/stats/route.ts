import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server_auth";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Database not connected" }, { status: 500 });
  }

  try {
    // 1. Total users
    const { count: usersCount } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // 2. Total quiz sessions
    const { count: sessionsCount } = await adminClient
      .from("quiz_sessions")
      .select("id", { count: "exact", head: true });

    // 3. Total questions
    const { count: questionsCount } = await adminClient
      .from("questions")
      .select("id", { count: "exact", head: true });

    // 4. Total challenges
    const { count: challengesCount } = await adminClient
      .from("challenge_sets")
      .select("id", { count: "exact", head: true });

    // 5. Questions breakdown by sport
    const { data: sportData } = await adminClient
      .from("questions")
      .select("sport");

    const sportCounts: Record<string, number> = {};
    if (sportData) {
      for (const row of sportData) {
        sportCounts[row.sport] = (sportCounts[row.sport] || 0) + 1;
      }
    }

    // 6. Questions breakdown by difficulty
    const { data: diffData } = await adminClient
      .from("questions")
      .select("difficulty");

    const diffCounts: Record<string, number> = {};
    if (diffData) {
      for (const row of diffData) {
        diffCounts[row.difficulty] = (diffCounts[row.difficulty] || 0) + 1;
      }
    }

    // 7. Recent quiz sessions
    const { data: recentSessions } = await adminClient
      .from("quiz_sessions")
      .select("id, user_id, sport, difficulty, question_count, score, accuracy, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: usersCount || 0,
        totalSessions: sessionsCount || 0,
        totalQuestions: questionsCount || 0,
        totalChallenges: challengesCount || 0,
        sportCounts,
        diffCounts,
        recentSessions: recentSessions || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
