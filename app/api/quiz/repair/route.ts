import { NextResponse } from "next/server";
import { generateForRequest } from "@/lib/services/personalized_request";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.questions) || body.questions.length < 1 || body.questions.length > 30) return NextResponse.json({ error: "Provide 1–30 questions." }, { status: 400 });
    const deck = await generateForRequest(req, { sport: body.sport || "All Sports", difficulty: body.difficulty || "Mixed", mode: "challenge", count: body.questions.length, candidates: body.questions, excludeStems: Array.isArray(body.excludeStems) ? body.excludeStems : [] });
    return NextResponse.json({ success: true, ...deck });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Question review failed" }, { status: 422 });
  }
}
