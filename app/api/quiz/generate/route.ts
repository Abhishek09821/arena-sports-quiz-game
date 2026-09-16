import { NextResponse } from "next/server";
import { generatePersonalizedQuiz } from "@/lib/services/question_manager";
import { getOptionalUser } from "@/lib/auth/server_auth";
import { type Sport, type Difficulty } from "@/data/questions";

export async function POST(req: Request) {
  try {
    const userAuth = await getOptionalUser(req);
    const body = await req.json().catch(() => ({}));

    const sport = (body.sport || "All Sports") as Sport | "All Sports";
    const difficulty = (body.difficulty || "Mixed") as Difficulty | "Mixed";
    const count = Math.min(Math.max(Number(body.count) || 10, 5), 30);
    const mode = body.mode || "classic";
    const category = body.category;
    const excludeStems = Array.isArray(body.excludeStems) ? body.excludeStems : [];
    const excludeAnswers = Array.isArray(body.excludeAnswers) ? body.excludeAnswers : [];

    const deck = await generatePersonalizedQuiz({
      userId: userAuth.userId,
      sport,
      difficulty,
      count,
      mode,
      category,
      excludeStems,
      excludeAnswers,
    });

    return NextResponse.json({
      success: true,
      ...deck,
    });
  } catch (error) {
    console.error("[API quiz/generate] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate quiz",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
