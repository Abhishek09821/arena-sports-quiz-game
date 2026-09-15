import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { data: session, error: sErr } = await adminClient
      .from("quiz_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (sErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: sessionQuestions } = await adminClient
      .from("quiz_session_questions")
      .select("question_order, selected_option, correct_option, is_correct, points_earned, questions(*)")
      .eq("session_id", id)
      .order("question_order", { ascending: true });

    return NextResponse.json({
      session,
      questions: sessionQuestions || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching session" },
      { status: 500 }
    );
  }
}
