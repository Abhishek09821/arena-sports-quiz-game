import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (supabaseUrl && anonKey) {
      const supabase = createClient(supabaseUrl, anonKey);
      try {
        await supabase.auth.exchangeCodeForSession(code);
      } catch (err) {
        console.error("[Auth Callback] Failed to exchange code for session:", err);
      }
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
