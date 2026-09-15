"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Shield, ArrowLeft, Mail, Lock, AlertCircle, KeyRound } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { audio } from "@/lib/audio";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, refreshProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    audio.click();

    const res = await signIn(email, password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    // Verify role in profiles
    if (!supabase) {
      setError("Database connection not established.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Failed to verify user credentials.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      setError("Access Denied: Your account does not possess administrator privileges.");
      setLoading(false);
      return;
    }

    await refreshProfile();
    audio.correct();
    router.push("/admin");
  };

  return (
    <main className="arena-container min-h-[calc(100vh-80px)] flex items-center justify-center py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors mb-6"
        >
          <ArrowLeft size={15} /> Home
        </Link>

        <div className="arena-card relative overflow-hidden border-arena-accent/30 shadow-[0_0_50px_rgba(0,212,255,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-arena-accent" />
            <span className="arena-eyebrow text-arena-accent">Security Clearance</span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            Admin Portal
          </h1>
          <p className="text-sm text-arena-muted mb-6">
            Authorized personnel only. Access live quiz sessions, manage models, and inspect user activity.
          </p>

          {error && (
            <motion.div
              className="arena-notice mb-4"
              data-variant="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className="flex items-center gap-2 text-arena-bad font-semibold text-sm">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@arena.com"
                  className="arena-input pl-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="arena-input pl-10 text-sm"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="arena-btn arena-btn-primary w-full justify-center mt-6 shadow-[0_0_25px_rgba(0,212,255,0.2)]"
              whileTap={{ scale: 0.98 }}
            >
              <KeyRound size={16} />
              {loading ? "Verifying Authorization..." : "Authenticate as Admin"}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-arena-line text-center text-xs text-arena-muted">
            Looking for regular user sign in?{" "}
            <Link href="/login" className="text-arena-accent hover:underline font-semibold">
              User Login
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
