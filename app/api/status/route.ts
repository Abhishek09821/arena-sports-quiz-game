import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      connected: false,
      message: "Supabase environment variables are missing in .env.local",
    }, { status: 500 });
  }

  const startTime = Date.now();
  const { data, error, count } = await supabase
    .from("questions")
    .select("id, question_text, sport, difficulty", { count: "exact" })
    .limit(5);

  const durationMs = Date.now() - startTime;

  if (error) {
    return NextResponse.json({
      connected: false,
      error: error.message,
      durationMs,
    }, { status: 500 });
  }

  return NextResponse.json({
    connected: true,
    message: "Supabase is successfully connected and responding!",
    database: {
      totalQuestions: count,
      sampleQuestions: data,
    },
    latencyMs: durationMs,
  });
}
