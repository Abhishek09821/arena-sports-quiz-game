import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { getOptionalUser } from "@/lib/auth/server_auth";
import { validateQuestion } from "@/lib/services/question_validator";

export async function POST(req: Request) {
  try {
    const userAuth = await getOptionalUser(req);
    if (!userAuth.userId) return NextResponse.json({error:"Sign in to save challenges."},{status:401});
    const body = await req.json();
    const { title = "Sports Challenge", sport = "All Sports", difficulty = "Mixed", questions = [], creatorName = "Player" } = body;

    if (!Array.isArray(questions) || questions.length !== 10) {
      return NextResponse.json({ error: "A challenge must contain exactly 10 questions" }, { status: 400 });
    }

    // Validate each question
    const validatedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const v = validateQuestion(questions[i]);
      if (!v.valid || !v.question) {
        return NextResponse.json(
          { error: `Question ${i + 1} is invalid: ${v.errors.join(", ")}` },
          { status: 422 }
        );
      }
      validatedQuestions.push(v.question);
    }

    const code = crypto.randomUUID().replace(/-/g, "").slice(0,8).toUpperCase();
    const adminClient = getSupabaseAdminClient();
    if (!adminClient) throw new Error("Database is unavailable. Challenge was not saved.");
    const {data, error} = await adminClient.from("challenge_sets").insert({
      code, created_by:userAuth.userId, creator_name:creatorName, title, sport, difficulty,
      question_count:validatedQuestions.length, settings:{questions:validatedQuestions},
    }).select("id").single();
    if(error || !data) throw new Error("Challenge could not be saved. Please retry.");
    const challengeId=data.id;

    return NextResponse.json({
      success: true,
      code,
      challengeId,
      questionCount: validatedQuestions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save challenge" },
      { status: 500 }
    );
  }
}
