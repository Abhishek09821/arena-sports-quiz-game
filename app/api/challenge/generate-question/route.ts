import { NextResponse } from "next/server";
import { generateForRequest } from "@/lib/services/personalized_request";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const deck = await generateForRequest(req, { ...body, sport: body.sport || "Cricket", difficulty: body.difficulty || "Medium", count: 1, mode: "challenge" });
    return NextResponse.json({ success: true, question: deck.questions[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to prepare question" }, { status: 422 });
  }
}
