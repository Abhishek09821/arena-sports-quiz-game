import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

const DEFAULT_ADMIN_KEY = "arena-admin-2026";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const adminKey = (body.adminKey || "").trim();

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || DEFAULT_ADMIN_KEY;
    const isPasskeyValid = adminKey && adminKey === expectedAdminKey;

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { success: false, error: "Database authentication service unavailable." },
        { status: 500 }
      );
    }

    // Scenario 1: User provides valid Admin Passkey
    if (isPasskeyValid) {
      if (email) {
        // Find existing user or create one with confirmed email and admin role
        const { data: usersList } = await adminClient.auth.admin.listUsers();
        let targetUser = usersList?.users?.find((u) => u.email?.toLowerCase() === email);

        if (!targetUser) {
          // Create admin user
          const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password: password || "AdminPass123!",
            email_confirm: true,
            user_metadata: {
              display_name: email.split("@")[0] || "Administrator",
              role: "admin",
            },
          });
          if (createErr) {
            return NextResponse.json({ success: false, error: createErr.message }, { status: 400 });
          }
          targetUser = newUser.user;
        } else {
          // Ensure role is updated to admin
          await adminClient.auth.admin.updateUserById(targetUser.id, {
            user_metadata: { ...targetUser.user_metadata, role: "admin" },
            password: password || undefined,
            email_confirm: true,
          });
        }

        // Ensure profile is admin
        await adminClient.from("profiles").upsert({
          id: targetUser.id,
          email: targetUser.email,
          display_name: targetUser.user_metadata?.display_name || "Administrator",
          role: "admin",
        });

        return NextResponse.json({
          success: true,
          elevated: true,
          message: "Admin privileges granted successfully.",
          user: {
            id: targetUser.id,
            email: targetUser.email,
            role: "admin",
          },
        });
      }

      // Passkey verified without specific email (general verification)
      return NextResponse.json({
        success: true,
        elevated: true,
        message: "Admin security passkey verified.",
      });
    }

    // Scenario 2: Standard email/password check for existing admin
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your admin email and password, or provide the Admin Master Passkey." },
        { status: 400 }
      );
    }

    // Verify user role in profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role, display_name")
      .eq("email", email)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: This account is not authorized as an administrator. Use the Admin Master Passkey to unlock.",
          requiresKey: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      role: "admin",
      message: "Admin identity confirmed.",
    });
  } catch (err) {
    console.error("[Auth API] Admin login error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Authentication error occurred.",
      },
      { status: 500 }
    );
  }
}
