import { NextResponse } from "next/server";
import { authenticateRequest, UserAuthContext } from "@/lib/supabase-server";

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
 * Ensures the incoming request is from an authenticated user with 'admin' role.
 */
export async function requireAdmin(req: Request): Promise<UserAuthContext | NextResponse> {
  const auth = await authenticateRequest(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(
      { error: "Authentication required", message: "You must be signed in as an administrator." },
      { status: 401 }
    );
  }

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden", message: "Administrator privileges required." },
      { status: 403 }
    );
  }

  return auth;
}

/**
 * Retrieves authenticated user if available, otherwise returns null without error.
 */
export async function getOptionalUser(req: Request): Promise<UserAuthContext> {
  return authenticateRequest(req);
}
