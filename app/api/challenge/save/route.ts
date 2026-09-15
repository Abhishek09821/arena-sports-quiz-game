import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { getOptionalUser } from "@/lib/auth/server_auth";
import { validateQuestion } from "@/lib/services/question_validator";

export async function POST(req: Request) {
  try {
    const userAuth = await getOptionalUser(req);
    const body = await req.json();
    const { title = "Sports Challenge", sport = "All Sports", difficulty = "Mixed", questions = [], creatorName = "Player" } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Questions array cannot be empty" }, { status: 400 });
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

    // Generate unique 6-char alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const adminClient = getSupabaseAdminClient();

    let challengeId = `chal-${Date.now()}`;

    if (adminClient) {
      try {
        // 1. Insert challenge set
        const { data: setRecord, error: setError } = await adminClient
          .from("challenge_sets")
          .insert({
            code,
            created_by: userAuth.userId || null,
            creator_name: creatorName,
            title,
            sport,
            difficulty,
            question_count: validatedQuestions.length,
          })
          .select("id")
          .single();

        if (!setError && setRecord) {
          challengeId = setRecord.id;

          // 2. Insert challenge questions
          const qRows = validatedQuestions.map((q, idx) => ({
            challenge_id: challengeId,
            question_order: idx + 1,
            question_text: q.question,
            options: q.options,
            correct_answer: q.correctAnswerText,
            correct_option: q.answer,
            explanation: q.explanation,
            sport: q.sport,
            difficulty: q.difficulty,
          }));

          await adminClient.from("challenge_questions").insert(qRows);
        } else {
          // If 002 migration has not been applied to Supabase yet, attempt legacy challenges table
          await adminClient.from("challenges").insert({
            code,
            creator_name: creatorName,
            question_ids: [],
            settings: { title, sport, difficulty, questions: validatedQuestions },
          });
        }
      } catch (dbErr) {
        console.warn("[Challenge Save] Notice: Remote Supabase requires migration 002. Proceeding with generated code.", dbErr);
      }
    }

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
