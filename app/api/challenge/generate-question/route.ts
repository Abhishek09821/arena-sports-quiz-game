import { NextResponse } from "next/server";
import { generateAIQuestions } from "@/lib/services/ai_question_generator";
import { validateQuestion } from "@/lib/services/question_validator";
import { randomizeQuestionOptions } from "@/lib/services/question_manager";
import { auditCandidateQuestion, type DeckAuditContext } from "@/lib/services/deck_auditor";
import { type Sport, type Difficulty } from "@/data/questions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sport = (body.sport || "Cricket") as Sport;
    const difficulty = (body.difficulty || "Medium") as Difficulty;
    const category = body.category;
    const excludeStems = Array.isArray(body.excludeStems) ? body.excludeStems : [];
    const excludeAnswers = Array.isArray(body.excludeAnswers) ? body.excludeAnswers : [];

    const auditContext: DeckAuditContext = {
      sport,
      difficulty,
      category,
      excludeStems,
      excludeAnswers,
    };

    // Generate single question with self-healing retry loop (max 5 attempts)
    let certifiedQuestion = null;
    let attempts = 0;
    const maxAttempts = 5;
    let lastErrors: string[] = [];

    while (!certifiedQuestion && attempts < maxAttempts) {
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
        const validation = validateQuestion(raw, category);
        if (!validation.valid || !validation.question) {
          lastErrors = validation.errors;
          continue;
        }

        // Strict audit against builder questions and historical seen registry
        const audit = auditCandidateQuestion(validation.question, [], auditContext);
        if (audit.passed) {
          certifiedQuestion = validation.question;
          break;
        } else {
          lastErrors = audit.reasons;
          // Append rejected candidate to exclude lists for subsequent attempts
          excludeStems.push(validation.question.question.slice(0, 45));
          excludeAnswers.push(validation.question.correctAnswerText);
        }
      }
    }

    if (!certifiedQuestion) {
      return NextResponse.json(
        { error: "Validation failed after retries", details: lastErrors },
        { status: 422 }
      );
    }

    // Shuffle options & map answer
    const randomized = randomizeQuestionOptions(certifiedQuestion);

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
