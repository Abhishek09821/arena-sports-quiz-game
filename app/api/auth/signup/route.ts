import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const displayName = (body.displayName || "").trim() || email.split("@")[0] || "Player";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { success: false, error: "Database authentication service is currently unavailable." },
        { status: 500 }
      );
    }

    // Create user via admin API with email_confirm: true to avoid rate-limiting and SMTP issues
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: "user",
      },
    });

    if (error) {
      // Check if user already exists
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already exists")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email already exists. Please sign in instead.",
            code: "USER_EXISTS",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    const userId = data.user.id;

    // Upsert profile in database
    await adminClient.from("profiles").upsert({
      id: userId,
      email,
      display_name: displayName,
      role: "user",
      total_games_played: 0,
      total_score: 0,
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: userId,
        email,
        displayName,
      },
    });
  } catch (err) {
    console.error("[Auth API] Sign up error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create account.",
      },
      { status: 500 }
    );
  }
}
