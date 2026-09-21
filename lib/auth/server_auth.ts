import { NextResponse } from "next/server";
import { authenticateRequest, UserAuthContext } from "@/lib/supabase-server";
import { verifyAdminToken } from "@/lib/auth/admin_token";

/**
 * Ensures the incoming request is from an authenticated user.
 */
export async function requireUser(req: Request): Promise<UserAuthContext | NextResponse> {
  const auth = await authenticateRequest(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(
      { error: "Authentication required", message: "You must be signed in to perform this action." },
      { status: 401 }
    );
  }
  return auth;
}

/**
 * Ensures the incoming request has valid Admin Portal clearance.
 * Strictly verifies artificial Admin Portal ID & Key credentials.
 * Regular users (Google/Email) cannot pass this check.
 */
export async function requireAdmin(req: Request): Promise<UserAuthContext | NextResponse> {
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const xAdminKey = req.headers.get("x-admin-key");

  const cookieHeader = req.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(/arena_admin_token=([^;]+)/);
  const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  const candidate = bearerToken || xAdminKey || cookieToken;

  if (candidate && verifyAdminToken(candidate)) {
    return {
      isAuthenticated: true,
      userId: "admin-master",
      role: "admin",
      email: "admin@arena.internal",
    };
  }

  return NextResponse.json(
    {
      error: "Unauthorized",
      message: "Restricted Access: Admin ID and Security Key required.",
    },
    { status: 401 }
  );
}

/**
 * Retrieves authenticated user if available, otherwise returns null without error.
 */
export async function getOptionalUser(req: Request): Promise<UserAuthContext> {
  return authenticateRequest(req);
}
