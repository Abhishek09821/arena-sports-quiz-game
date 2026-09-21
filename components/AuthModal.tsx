"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User, Shield, Sparkles, LogIn, UserPlus, AlertCircle, KeyRound, ArrowRight } from "lucide-react";
import { useAuth, AuthModalMode } from "@/components/AuthContext";
import { validateEmail } from "@/lib/auth/email_validator";
import { audio } from "@/lib/audio";

export default function AuthModal() {
  const router = useRouter();
  const {
    isAuthModalOpen,
    authModalMode,
    authRedirectUrl,
    closeAuthModal,
    signIn,
    signInWithGoogle,
    signUp,
    elevateToAdmin,
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(authModalMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPasskey, setAdminPasskey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sync mode with context
  useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);
    audio.click();
    const target = authRedirectUrl || "/";
    const res = await signInWithGoogle(target);
    if (res.error) {
      setError(res.error);
      setGoogleLoading(false);
      audio.wrong();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email for user signup / signin
    if (mode !== "admin" || (email && !adminPasskey)) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        setError(emailCheck.error || "Please enter a valid email address.");
        audio.wrong();
        return;
      }
    }

    setLoading(true);
    audio.click();

    try {
      if (mode === "signup") {
        if (!displayName.trim()) {
          setError("Please provide a player nickname or display name.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }

        const res = await signUp(email, password, displayName);
        if (res.error) {
          setError(res.error);
          if (res.code === "USER_EXISTS") {
            setMode("signin");
          }
          audio.wrong();
          setLoading(false);
          return;
        }
      } else if (mode === "signin") {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
          audio.wrong();
          setLoading(false);
          return;
        }
      } else if (mode === "admin") {
        if (!adminPasskey.trim() && (!email || !password)) {
          setError("Please provide your Admin Master Passkey or Email + Password.");
          setLoading(false);
          return;
        }

        // If email & password given, sign in first
        if (email && password) {
          await signIn(email, password);
        }

        // Elevate with passkey
        if (adminPasskey.trim()) {
          const elevRes = await elevateToAdmin(adminPasskey.trim());
          if (elevRes.error) {
            setError(elevRes.error);
            audio.wrong();
            setLoading(false);
            return;
          }
        }
      }

      audio.correct();
      closeAuthModal();

      // Forward to target redirect URL if one was set
      if (authRedirectUrl) {
        router.push(authRedirectUrl);
      } else if (mode === "admin") {
        router.push("/admin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      audio.wrong();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
        />

        {/* Modal Dialog */}
        <motion.div
          className="relative w-full max-w-[440px] bg-arena-panel border border-arena-line rounded-2xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(0,212,255,0.08)] z-10 overflow-hidden"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
        >
          {/* Close button */}
          <button
            onClick={() => {
              audio.click();
              closeAuthModal();
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl border border-arena-line bg-white/[.04] text-arena-muted hover:text-arena-text hover:bg-white/[.08] grid place-items-center transition-colors"
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>

          {/* Header Eyebrow */}
          <div className="flex items-center gap-1.5 text-xs text-arena-accent font-semibold tracking-wider uppercase mb-1">
            <Sparkles size={13} />
            <span>Arena Player Access</span>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight mb-1 text-arena-text">
            {mode === "signup" && "Sign up to start playing"}
            {mode === "signin" && "Welcome back"}
            {mode === "admin" && "Admin Clearance"}
          </h2>
          <p className="text-xs text-arena-muted mb-5 leading-relaxed">
            {mode === "signup" && "Create your profile to compete, track personal stats, and generate personalized AI questions."}
            {mode === "signin" && "Log in to resume your streak, access saved challenges, and play your personalized quiz decks."}
            {mode === "admin" && "Enter your admin master passkey to access live telemetry and system management."}
          </p>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-black/40 border border-arena-line p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                audio.select();
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "signup"
                  ? "bg-arena-accent text-arena-bg shadow-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              <UserPlus size={12} />
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                audio.select();
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "signin"
                  ? "bg-arena-accent text-arena-bg shadow-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              <LogIn size={12} />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("admin");
                setError(null);
                audio.select();
              }}
              className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === "admin"
                  ? "bg-arena-accent2 text-white shadow-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              <Shield size={12} />
              Admin
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <motion.div
              className="arena-notice mb-4"
              data-variant="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 text-arena-bad font-medium text-xs">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {/* Google Auth for User modes */}
          {mode !== "admin" && (
            <>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/[.04] border border-white/10 hover:border-white/25 hover:bg-white/[.08] text-xs font-semibold transition-all text-arena-text shadow-sm mb-4"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
                </svg>
                {googleLoading ? "Connecting to Google..." : mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
              </button>

              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-arena-line" /></div>
                <span className="relative bg-arena-panel px-2 text-[10px] font-bold tracking-wider uppercase text-arena-muted">
                  or continue with email
                </span>
              </div>
            </>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-arena-muted mb-1">
                  Player Name / Nickname
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Striker99"
                    className="arena-input pl-10 text-sm py-2"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-arena-muted mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@arena.com"
                  className="arena-input pl-10 text-sm py-2"
                />
              </div>
            </div>

            {mode !== "admin" && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-arena-muted mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="arena-input pl-10 text-sm py-2"
                  />
                </div>
              </div>
            )}

            {mode === "admin" && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-arena-muted mb-1">
                    Password (Optional if Passkey provided)
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="arena-input pl-10 text-sm py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-arena-accent mb-1 flex items-center justify-between">
                    <span>Admin Master Passkey</span>
                    <span className="text-[10px] text-arena-muted font-normal">Default: arena-admin-2026</span>
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arena-accent" />
                    <input
                      type="password"
                      value={adminPasskey}
                      onChange={(e) => setAdminPasskey(e.target.value)}
                      placeholder="arena-admin-2026"
                      className="arena-input pl-10 text-sm py-2 border-arena-accent/40 focus:border-arena-accent"
                    />
                  </div>
                </div>
              </>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="arena-btn arena-btn-primary w-full justify-center mt-4 text-sm py-2.5 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span>Please wait...</span>
              ) : mode === "signup" ? (
                <>
                  <UserPlus size={15} />
                  <span>Create Account & Play</span>
                  <ArrowRight size={14} />
                </>
              ) : mode === "signin" ? (
                <>
                  <LogIn size={15} />
                  <span>Sign In & Play</span>
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <Shield size={15} />
                  <span>Unlock Admin Portal</span>
                  <ArrowRight size={14} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer toggle */}
          <div className="mt-4 pt-3.5 border-t border-arena-line text-center text-[11px] text-arena-muted">
            {mode === "signup" ? (
              <div>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    audio.click();
                  }}
                  className="text-arena-accent hover:underline font-semibold"
                >
                  Sign In
                </button>
              </div>
            ) : mode === "signin" ? (
              <div>
                New to Arena?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    audio.click();
                  }}
                  className="text-arena-accent hover:underline font-semibold"
                >
                  Create an account
                </button>
              </div>
            ) : (
              <div>
                Return to player sign in:{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    audio.click();
                  }}
                  className="text-arena-accent hover:underline font-semibold"
                >
                  Player Login
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
