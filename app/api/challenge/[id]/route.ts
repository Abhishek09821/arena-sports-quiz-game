import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const isCode = id.length <= 8;

    // 1. Check challenge_sets
    let query = adminClient.from("challenge_sets").select("*");
    if (isCode) {
      query = query.eq("code", id.toUpperCase());
    } else {
      query = query.eq("id", id);
    }

    const { data: challengeSet } = await query.maybeSingle();

    if (challengeSet) {
      await adminClient
        .from("challenge_sets")
        .update({ play_count: (challengeSet.play_count || 0) + 1 })
        .eq("id", challengeSet.id);

      const { data: questions } = await adminClient
        .from("challenge_questions")
        .select("*")
        .eq("challenge_id", challengeSet.id)
        .order("question_order", { ascending: true });

      return NextResponse.json({
        challenge: challengeSet,
        questions: questions || [],
      });
    }

    // 2. Fallback to legacy challenges table
    const { data: legacy } = await adminClient
      .from("challenges")
      .select("*")
      .eq("code", id.toUpperCase())
      .maybeSingle();

    if (legacy) {
      const qList = legacy.settings?.questions || [];
      return NextResponse.json({
        challenge: {
          id: legacy.id,
          code: legacy.code,
          title: legacy.settings?.title || "Challenge",
          creator_name: legacy.creator_name || "Challenger",
          sport: legacy.settings?.sport || "All Sports",
          difficulty: legacy.settings?.difficulty || "Mixed",
          play_count: legacy.play_count || 0,
        },
        questions: qList,
      });
    }

    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching challenge" },
      { status: 500 }
    );
  }
}
