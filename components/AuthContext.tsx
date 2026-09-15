"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "admin";
  total_games_played: number;
  total_score: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (currentUser: User) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as UserProfile);
      } else {
        // Construct fallback profile
        setProfile({
          id: currentUser.id,
          email: currentUser.email || "",
          display_name: currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "Player",
          role: currentUser.user_metadata?.role === "admin" ? "admin" : "user",
          total_games_played: 0,
          total_score: 0,
        });
      }
    } catch {
      // Quietly set fallback
      setProfile({
        id: currentUser.id,
        email: currentUser.email || "",
        display_name: currentUser.email?.split("@")[0] || "Player",
        role: "user",
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

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase connection is not available." };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await fetchProfile(data.user);
    }
    return {};
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!supabase) return { error: "Supabase connection is not available." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
          role: "user",
        },
      },
    });

    if (error) return { error: error.message };

    // Create profile entry if user was created
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        display_name: displayName || email.split("@")[0],
        role: "user",
      });
      await fetchProfile(data.user);
    }

    return {};
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

  const token = session?.access_token || null;
  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        token,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
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
