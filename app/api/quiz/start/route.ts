import { NextResponse } from "next/server";
import { generatePersonalizedQuiz } from "@/lib/services/question_manager";
import { getOptionalUser } from "@/lib/auth/server_auth";

export async function POST(req: Request) {
  try {
    const userAuth = await getOptionalUser(req);
    const body = await req.json().catch(() => ({}));

    const deck = await generatePersonalizedQuiz({
      userId: userAuth.userId,
      sport: body.sport || "All Sports",
      difficulty: body.difficulty || "Mixed",
      count: Math.min(Math.max(Number(body.count) || 10, 5), 30),
      mode: body.mode || "classic",
      category: body.category,
    });

    return NextResponse.json({
      success: true,
      ...deck,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start quiz",
        message: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    );
  }
}
