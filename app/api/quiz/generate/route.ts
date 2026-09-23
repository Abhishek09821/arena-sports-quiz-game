import { quizErrorResponse } from "@/lib/services/quiz_error";
import { NextResponse } from "next/server";
import { generateForRequest } from "@/lib/services/personalized_request";
import { type Sport, type Difficulty } from "@/data/questions";

export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const sport = (body.sport || "All Sports") as Sport | "All Sports";
    const difficulty = (body.difficulty || "Mixed") as Difficulty | "Mixed";
    const count = Math.min(Math.max(Number(body.count) || 10, 5), 30);
    const mode = body.mode || "classic";
    const category = body.category;
    const excludeStems = Array.isArray(body.excludeStems) ? body.excludeStems : [];
    const excludeAnswers = Array.isArray(body.excludeAnswers) ? body.excludeAnswers : [];
    const decade = body.decade || undefined;
    const idol = body.idol || undefined;

    const deck = await generateForRequest(req, {
      sport,
      difficulty,
      count,
      mode,
      category,
      excludeStems,
      excludeAnswers,
      decade,
      idol,
    });

    return NextResponse.json({
      success: true,
      ...deck,
    });
  } catch (error) {
    return quizErrorResponse(error);
  }
}
