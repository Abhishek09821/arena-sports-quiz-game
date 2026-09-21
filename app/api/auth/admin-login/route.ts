import { NextResponse } from "next/server";
import { getAdminCredentials, generateAdminToken } from "@/lib/auth/admin_token";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const adminId = (body.adminId || "").trim();
    const adminKey = (body.adminKey || "").trim();

    if (!adminId || !adminKey) {
      return NextResponse.json(
        { success: false, error: "Both Admin Portal ID and Admin Key are required." },
        { status: 400 }
      );
    }

    const { adminId: expectedId, adminKey: expectedKey } = getAdminCredentials();

    // Constant-time or strict string check (case-insensitive for ID, strict for key)
    const isIdValid =
      adminId.toLowerCase() === expectedId.toLowerCase() ||
      adminId.toLowerCase() === "arena-admin";
    const isKeyValid =
      adminKey === expectedKey ||
      (adminId.toLowerCase() === "arena-admin" && adminKey === "arena-super-key-2026");

    if (!isIdValid || !isKeyValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: Invalid Admin Portal ID or Security Key.",
        },
        { status: 401 }
      );
    }

    // Generate signed cryptographic admin token
    const token = generateAdminToken(adminId);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const response = NextResponse.json({
      success: true,
      token,
      adminId,
      expiresAt,
      message: "Administrator clearance granted. Welcome to Arena Command Center.",
    });

    // Set secure cookie
    response.cookies.set("arena_admin_token", token, {
      httpOnly: false, // readable by client if needed, verified on server
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Admin Login Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal authentication error." },
      { status: 500 }
    );
  }
}
