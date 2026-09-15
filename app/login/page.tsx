"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { LogIn, ArrowLeft, Mail, Lock, AlertCircle, Shield } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { audio } from "@/lib/audio";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

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
          <div className="arena-eyebrow mb-2">Welcome Back</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            User Sign In
          </h1>
          <p className="text-sm text-arena-muted mb-6">
            Log in to preserve your quiz history, track progress, and avoid duplicate questions.
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
                  placeholder="••••••••"
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
              <LogIn size={16} />
              {loading ? "Signing In..." : "Sign In"}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-arena-line flex items-center justify-between text-xs text-arena-muted">
            <div>
              New player?{" "}
              <Link href="/signup" className="text-arena-accent hover:underline font-semibold">
                Create account
              </Link>
            </div>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1 text-arena-muted hover:text-arena-text transition-colors"
            >
              <Shield size={13} />
              Admin Portal
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
