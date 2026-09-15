import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server_auth";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Database not connected" }, { status: 500 });
  }

  try {
    const { data: users, error } = await adminClient
      .from("profiles")
      .select("id, email, display_name, role, total_games_played, total_score, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, users: users || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}
