import { NextResponse } from "next/server";
import { generateAIQuestions } from "@/lib/services/ai_question_generator";
import { validateQuestion } from "@/lib/services/question_validator";
import { randomizeQuestionOptions } from "@/lib/services/question_manager";
import { type Sport, type Difficulty } from "@/data/questions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sport = (body.sport || "Cricket") as Sport;
    const difficulty = (body.difficulty || "Medium") as Difficulty;
    const category = body.category;
    const excludeStems = Array.isArray(body.excludeStems) ? body.excludeStems : [];
    const excludeAnswers = Array.isArray(body.excludeAnswers) ? body.excludeAnswers : [];

    // Generate single question
    const rawBatch = await generateAIQuestions({
      sport,
      difficulty,
      count: 1,
      category,
      excludeStems,
      excludeAnswers,
    });

    if (rawBatch.length === 0) {
      return NextResponse.json({ error: "No question generated" }, { status: 500 });
    }

    const validation = validateQuestion(rawBatch[0]);
    if (!validation.valid || !validation.question) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 422 }
      );
    }

    // Shuffle options & map answer
    const randomized = randomizeQuestionOptions(validation.question);

    return NextResponse.json({
      success: true,
      question: randomized,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate challenge question",
      },
      { status: 500 }
    );
  }
}
