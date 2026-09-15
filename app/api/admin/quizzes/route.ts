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
    const { data: quizzes, error } = await adminClient
      .from("quiz_sessions")
      .select("id, user_id, sport, difficulty, question_count, mode, status, score, accuracy, total_time_seconds, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, quizzes: quizzes || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
