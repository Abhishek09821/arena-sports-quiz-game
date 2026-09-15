"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Shield, ArrowLeft, Mail, Lock, AlertCircle, KeyRound, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { audio } from "@/lib/audio";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, refreshProfile } = useAuth();

  const [authMethod, setAuthMethod] = useState<"passkey" | "credentials">("passkey");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    audio.click();

    try {
      if (authMethod === "passkey") {
        if (!adminKey.trim()) {
          setError("Please enter the Admin Master Passkey.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase() || "admin@arena.com",
            password: password || "AdminPass123!",
            adminKey: adminKey.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Invalid Admin Master Passkey.");
          audio.wrong();
          setLoading(false);
          return;
        }

        // Sign in with the credentials
        const loginEmail = email.trim().toLowerCase() || "admin@arena.com";
        const loginPass = password || "AdminPass123!";
        const loginRes = await signIn(loginEmail, loginPass);
        if (loginRes.error) {
          // If already signed in or special case
          console.warn("[Admin Login] Sign in note:", loginRes.error);
        }

        await refreshProfile();
        setSuccessMsg("Administrator clearance granted! Redirecting...");
        audio.correct();
        setTimeout(() => {
          router.push("/admin");
        }, 600);
        return;
      }

      // Credentials method
      const loginRes = await signIn(email, password);
      if (loginRes.error) {
        setError(loginRes.error);
        audio.wrong();
        setLoading(false);
        return;
      }

      // Verify role
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "This account does not have administrator privileges. Use the Admin Master Passkey tab.");
        audio.wrong();
        setLoading(false);
        return;
      }

      await refreshProfile();
      setSuccessMsg("Authentication successful! Redirecting to Admin Dashboard...");
      audio.correct();
      setTimeout(() => {
        router.push("/admin");
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error occurred.");
      audio.wrong();
    } finally {
      setLoading(false);
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

        <div className="arena-card relative overflow-hidden border-arena-accent/30 shadow-[0_0_50px_rgba(0,212,255,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-arena-accent" />
              <span className="arena-eyebrow text-arena-accent">Security Clearance</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-arena-accent/15 text-arena-accent font-semibold">
              Admin Portal
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            Admin Access
          </h1>
          <p className="text-sm text-arena-muted mb-5">
            Authenticate to access live telemetry, manage models, review questions, and inspect user activity.
          </p>

          {/* Method selector */}
          <div className="flex rounded-xl bg-black/40 border border-arena-line p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("passkey");
                setError("");
                audio.select();
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === "passkey"
                  ? "bg-arena-accent text-arena-bg shadow-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              <KeyRound size={13} />
              Master Passkey (Instant)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("credentials");
                setError("");
                audio.select();
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === "credentials"
                  ? "bg-arena-accent text-arena-bg shadow-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              <Mail size={13} />
              Email & Password
            </button>
          </div>

          {error && (
            <motion.div
              className="arena-notice mb-4"
              data-variant="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className="flex items-center gap-2 text-arena-bad font-semibold text-xs">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              className="arena-notice mb-4"
              data-variant="success"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className="flex items-center gap-2 text-arena-good font-semibold text-xs">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMethod === "passkey" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-arena-accent mb-1.5 flex items-center justify-between">
                    <span>Admin Master Passkey</span>
                    <span className="text-[10px] text-arena-muted font-normal">Default: arena-admin-2026</span>
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-accent" />
                    <input
                      type="password"
                      required
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="arena-admin-2026"
                      className="arena-input pl-10 text-sm border-arena-accent/40 focus:border-arena-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                    Your Email (to link admin privileges)
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="abhishek@gmail.com"
                      className="arena-input pl-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                    Account Password (Optional)
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="arena-input pl-10 text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                    Admin Email Address
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
              </>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="arena-btn arena-btn-primary w-full justify-center mt-6 shadow-[0_0_25px_rgba(0,212,255,0.25)]"
              whileTap={{ scale: 0.98 }}
            >
              <Shield size={16} />
              {loading ? "Authenticating Clearance..." : "Authenticate as Admin"}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t border-arena-line flex items-center justify-between text-xs text-arena-muted">
            <Link href="/login" className="text-arena-accent hover:underline font-semibold">
              Player Login
            </Link>
            <span className="text-[11px] text-arena-muted/70 flex items-center gap-1">
              <Sparkles size={11} className="text-arena-accent" />
              Role: System Administrator
            </span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
