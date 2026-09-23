import { quizErrorResponse } from "@/lib/services/quiz_error";
import { NextResponse } from "next/server";
import { generateForRequest } from "@/lib/services/personalized_request";

export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const deck = await generateForRequest(req, {
      sport: body.sport || "All Sports",
      difficulty: body.difficulty || "Mixed",
      count: Math.min(Math.max(Number(body.count) || 10, 5), 30),
      mode: body.mode || "classic",
      category: body.category,
      idol: body.idol,
      decade: body.decade,
      excludeStems: Array.isArray(body.excludeStems) ? body.excludeStems : [],
    });

    return NextResponse.json({
      success: true,
      ...deck,
    });
  } catch (error) {
    return quizErrorResponse(error);
  }
}
