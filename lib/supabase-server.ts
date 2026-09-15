import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Privileged server-side client.
 * Uses service role key if available to bypass RLS for server-side management,
 * or falls back to anon key.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const key = serviceRoleKey || anonKey;
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server-side client scoped to a user's Authorization Bearer token.
 * Enforces user-level Row Level Security (RLS).
 */
export function getSupabaseServerClient(authHeader?: string | null): SupabaseClient | null {
  if (!supabaseUrl || !anonKey) return null;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader?.trim();

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

export interface UserAuthContext {
  userId: string | null;
  email: string | null;
  role: "user" | "admin";
  isAuthenticated: boolean;
}

/**
 * Extract authenticated user and verify role from request headers
 */
export async function authenticateRequest(req: Request): Promise<UserAuthContext> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { userId: null, email: null, role: "user", isAuthenticated: false };
  }

  const client = getSupabaseServerClient(authHeader);
  if (!client) {
    return { userId: null, email: null, role: "user", isAuthenticated: false };
  }

  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) {
      return { userId: null, email: null, role: "user", isAuthenticated: false };
    }

    // Query profile for role
    const adminClient = getSupabaseAdminClient() || client;
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile?.role === "admin" ? "admin" : "user") as "user" | "admin";

    return {
      userId: user.id,
      email: user.email || null,
      role,
      isAuthenticated: true,
    };
  } catch {
    return { userId: null, email: null, role: "user", isAuthenticated: false };
  }
}
