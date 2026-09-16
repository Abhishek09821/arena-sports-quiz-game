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

    // Generate single question with retry loop for resilience
    let validatedQuestion = null;
    let attempts = 0;
    const maxAttempts = 3;
    let lastErrors: string[] = [];

    while (!validatedQuestion && attempts < maxAttempts) {
      attempts++;
      const rawBatch = await generateAIQuestions({
        sport,
        difficulty,
        count: 1,
        mode: "challenge",
        category,
        excludeStems,
        excludeAnswers,
      });

      for (const raw of rawBatch) {
        const validation = validateQuestion(raw);
        if (validation.valid && validation.question) {
          validatedQuestion = validation.question;
          break;
        } else {
          lastErrors = validation.errors;
        }
      }
    }

    if (!validatedQuestion) {
      return NextResponse.json(
        { error: "Validation failed after retries", details: lastErrors },
        { status: 422 }
      );
    }

    // Shuffle options & map answer
    const randomized = randomizeQuestionOptions(validatedQuestion);

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
