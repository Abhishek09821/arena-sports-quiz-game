"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { validateEmail } from "@/lib/auth/email_validator";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "admin";
  total_games_played: number;
  total_score: number;
}

export type AuthModalMode = "signin" | "signup" | "admin";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  // Modal controls
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  authRedirectUrl: string | null;
  openAuthModal: (mode?: AuthModalMode, redirectUrl?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (targetUrl?: string, callback?: () => void) => boolean;
  // Actions
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string; code?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  elevateToAdmin: (adminKey: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = new Set(["abhishek@gmail.com", "akhilbhai605@gmail.com"]);

/** Validate and sanitize redirect URLs to prevent open-redirect / script injection */
function sanitizeRedirect(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (clean.startsWith("/") && !clean.startsWith("//") && !clean.toLowerCase().startsWith("/\\")) {
    return clean;
  }
  return "/play";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Global Auth Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("signup");
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | null>(null);

  const openAuthModal = useCallback((mode: AuthModalMode = "signup", redirectUrl?: string) => {
    setAuthModalMode(mode);
    setAuthRedirectUrl(sanitizeRedirect(redirectUrl));
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthRedirectUrl(null);
  }, []);

  const fetchProfile = async (currentUser: User) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      const isKnownAdminEmail = currentUser.email && ADMIN_EMAILS.has(currentUser.email.toLowerCase());

      if (data && !error) {
        const resolvedRole = (data.role === "admin" || isKnownAdminEmail) ? "admin" : "user";
        setProfile({
          ...data,
          role: resolvedRole,
        } as UserProfile);
      } else {
        // Construct fallback profile
        setProfile({
          id: currentUser.id,
          email: currentUser.email || "",
          display_name: currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "Player",
          role: (currentUser.user_metadata?.role === "admin" || isKnownAdminEmail) ? "admin" : "user",
          total_games_played: 0,
          total_score: 0,
        });
      }
    } catch {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || "",
        display_name: currentUser.email?.split("@")[0] || "Player",
        role: (currentUser.email && ADMIN_EMAILS.has(currentUser.email.toLowerCase())) ? "admin" : "user",
        total_games_played: 0,
        total_score: 0,
      });
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (redirectPath = "/play") => {
    if (!supabase) return { error: "Supabase connection is not available." };
    const safePath = (redirectPath && redirectPath.startsWith("/") && !redirectPath.startsWith("//")) ? redirectPath : "/play";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}${safePath}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) return { error: error.message };
    return {};
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase connection is not available." };
    const emailResult = validateEmail(email);
    if (!emailResult.valid || !emailResult.normalized) {
      return { error: emailResult.error || "Please enter a valid email address." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailResult.normalized,
      password,
    });
    if (error) return { error: error.message };
    if (data.user) {
      await fetchProfile(data.user);
    }
    return {};
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!supabase) return { error: "Supabase connection is not available." };

    const emailResult = validateEmail(email);
    if (!emailResult.valid || !emailResult.normalized) {
      return { error: emailResult.error || "Please enter a valid email address." };
    }
    const cleanEmail = emailResult.normalized;
    const cleanName = (displayName || "").replace(/<[^>]*>?/gm, "").trim().slice(0, 40);

    try {
      // 1. Create account via server-side API to guarantee email confirmation and bypass rate-limit issues
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          displayName: cleanName,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return {
          error: resData.error || "Failed to create account.",
          code: resData.code,
        };
      }

      // 2. Immediately sign in the user
      const loginRes = await signIn(cleanEmail, password);
      if (loginRes.error) {
        return { error: loginRes.error };
      }

      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Network error during sign up." };
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const elevateToAdmin = async (adminKey: string) => {
    if (!user || !user.email) {
      return { error: "You must be signed in to elevate privileges." };
    }

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          adminKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { error: data.error || "Invalid Admin Master Passkey." };
      }

      await refreshProfile();
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Elevation request failed." };
    }
  };

  /**
   * Action gate: Returns true if authenticated, or opens AuthModal and returns false.
   */
  const requireAuth = useCallback((targetUrl?: string, callback?: () => void): boolean => {
    if (user) {
      if (callback) callback();
      return true;
    }
    openAuthModal("signup", targetUrl);
    return false;
  }, [user, openAuthModal]);

  const token = session?.access_token || null;
  const isEmailAdmin = Boolean(user?.email && ADMIN_EMAILS.has(user.email.toLowerCase()));
  const isAdmin = profile?.role === "admin" || user?.user_metadata?.role === "admin" || isEmailAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        token,
        isAdmin,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        authRedirectUrl,
        openAuthModal,
        closeAuthModal,
        requireAuth,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
        elevateToAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
