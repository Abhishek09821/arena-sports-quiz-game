import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionId,
      questionId,
      selectedOption,
      correctOption,
      isCorrect,
      timeLeft,
      pointsEarned,
    } = body;

    if (!sessionId || !questionId) {
      return NextResponse.json({ error: "Missing sessionId or questionId" }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (adminClient) {
      await adminClient
        .from("quiz_session_questions")
        .update({
          selected_option: selectedOption,
          correct_option: correctOption,
          is_correct: isCorrect,
          time_left: timeLeft,
          points_earned: pointsEarned,
        })
        .eq("session_id", sessionId)
        .eq("question_id", questionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
