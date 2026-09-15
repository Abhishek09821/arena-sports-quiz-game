"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { UserPlus, ArrowLeft, Mail, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { audio } from "@/lib/audio";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    audio.click();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const res = await signUp(email, password, displayName);
    if (res.error) {
      setError(res.error);
      audio.wrong();
      setLoading(false);
    } else {
      audio.correct();
      router.push("/play");
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
