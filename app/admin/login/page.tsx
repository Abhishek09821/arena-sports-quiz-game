"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Shield, ArrowLeft, KeyRound, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, Terminal } from "lucide-react";
import { audio } from "@/lib/audio";

export default function AdminLoginPage() {
  const router = useRouter();

  const [adminId, setAdminId] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    audio.click();

    if (!adminId.trim() || !adminKey.trim()) {
      setError("Please provide both Admin Portal ID and Admin Key.");
      setLoading(false);
      audio.wrong();
      return;
    }

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: adminId.trim(),
          adminKey: adminKey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Access Denied: Invalid Admin Credentials.");
        audio.wrong();
        setLoading(false);
        return;
      }

      // Store verified admin session
      if (typeof window !== "undefined") {
        sessionStorage.setItem("arena_admin_token", data.token);
        sessionStorage.setItem("arena_admin_id", data.adminId);
      }

      setSuccessMsg("Security clearance verified! Entering Command Center...");
      audio.correct();

      setTimeout(() => {
        router.push("/admin");
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error occurred.");
      audio.wrong();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-arena-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-arena-muted hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Arena
        </Link>

        {/* Security Shield Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)] mb-4">
            <Shield size={32} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-semibold mb-2">
            <Terminal size={12} />
            <span>RESTRICTED ACCESS PORTAL</span>
          </div>
          <h2 className="text-3xl font-display font-extrabold text-white tracking-tight">
            Arena Command Center
          </h2>
          <p className="mt-2 text-sm text-arena-muted">
            Enter authorized Admin ID and Security Key. Regular user accounts (Google/Email) are strictly prohibited.
          </p>
        </div>

        {/* Form Card */}
        <div className="mt-8 bg-arena-card/90 backdrop-blur-xl border border-arena-line rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 font-mono"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center gap-2.5 font-semibold"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-arena-muted mb-1.5 uppercase tracking-wider">
                Admin Portal ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-arena-muted">
                  <Terminal size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/[.03] border border-arena-line rounded-xl text-white text-sm placeholder:text-arena-muted/50 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all font-mono"
                  placeholder="e.g. arena-admin"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-arena-muted mb-1.5 uppercase tracking-wider">
                Admin Master Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-arena-muted">
                  <KeyRound size={16} />
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  required
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white/[.03] border border-arena-line rounded-xl text-white text-sm placeholder:text-arena-muted/50 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all font-mono"
                  placeholder="••••••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-arena-muted hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 text-white hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Verifying Security Clearance...</span>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Authenticate Clearance</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-arena-line text-center">
            <p className="text-xs text-arena-muted/70 leading-relaxed">
              Default system ID is <span className="text-white font-mono">arena-admin</span>.
              <br />
              Environment variables: <span className="font-mono text-arena-accent/80">ADMIN_PORTAL_ID</span> & <span className="font-mono text-arena-accent/80">ADMIN_SECRET_KEY</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
