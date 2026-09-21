"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { UserPlus, ArrowLeft, Mail, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { validateEmail } from "@/lib/auth/email_validator";
import { audio } from "@/lib/audio";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    audio.click();
    const res = await signInWithGoogle("/");
    if (res.error) {
      setError(res.error);
      setGoogleLoading(false);
      audio.wrong();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Strict email validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error || "Please provide a valid email address.");
      audio.wrong();
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      audio.wrong();
      return;
    }

    setLoading(true);
    audio.click();

    const res = await signUp(email, password, displayName);
    if (res.error) {
      setError(res.error);
      audio.wrong();
      setLoading(false);
    } else {
      audio.correct();
      router.push("/");
    }
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

        <div className="arena-card relative overflow-hidden">
          <div className="arena-eyebrow mb-2">Join the Arena</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            Create Player Profile
          </h1>
          <p className="text-sm text-arena-muted mb-6">
            Sign up to unlock personalized AI questions, track lifetime streaks, and compete.
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

          {/* Google One-Click Sign Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/[.04] border border-white/10 hover:border-white/25 hover:bg-white/[.08] text-sm font-semibold transition-all text-arena-text shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z" />
            </svg>
            {googleLoading ? "Connecting to Google..." : "Continue with Google"}
          </button>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-arena-line" /></div>
            <span className="relative bg-arena-panel px-3 text-[11px] font-bold tracking-wider uppercase text-arena-muted">
              or register with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Striker99"
                  className="arena-input pl-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@arena.com"
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
                  placeholder="At least 6 characters"
                  className="arena-input pl-10 text-sm"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="arena-btn arena-btn-primary w-full justify-center mt-6"
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus size={16} />
              {loading ? "Creating Profile..." : "Sign Up"}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-arena-line text-center text-xs text-arena-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-arena-accent hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
