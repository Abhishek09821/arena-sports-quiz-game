"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { audio } from "@/lib/audio";
import { SPORT_LIST, SPORT_META, DIFFICULTY_LIST, TOURNAMENTS_BY_SPORT, type Difficulty, type Sport } from "@/data/questions";
import { useQuizStore } from "@/lib/store";
import { useAuth } from "@/components/AuthContext";
import { trackEvent } from "@/lib/analytics";
import QuizGame from "@/components/QuizGame";
import { getSeenStems, getSeenAnswers, recordQuestionsAsSeen } from "@/lib/seen_history";
import { ArrowLeft, Play, Check, Sparkles, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "motion/react";

const counts = [5, 10, 15, 20, 30];

const diffDescriptions: Record<Difficulty | "Mixed", string> = {
  Mixed: "Curated difficulty mix",
  Easy: "Great for warming up",
  Medium: "Balanced challenge",
  Hard: "Serious sports knowledge",
  Legendary: "Deep-cut facts & pressure timing",
};

const diffColors: Record<Difficulty | "Mixed", string> = {
  Mixed: "#00d4ff",
  Easy: "#22d37e",
  Medium: "#f59e0b",
  Hard: "#fb923c",
  Legendary: "#ff4d6a",
};

const loadingPhrases = [
  "Synthesizing questions via Google Gemini AI...",
  "Querying verified tournament records (1975-2026)...",
  "Filtering out questions seen by your profile...",
  "Validating option credibility & distractors...",
  "Randomizing answer positions with Fisher-Yates...",
  "Preparing your personalized quiz deck...",
];

function PlayContent() {
  const params = useSearchParams();
  const qs = params.get("sport");
  const initial = (SPORT_LIST.some((s) => s === qs) ? qs : "All Sports") as Sport | "All Sports";

  const { token, user, openAuthModal } = useAuth();
  const [sport, setSport] = useState<Sport | "All Sports">(initial);
  const [selectedTournament, setSelectedTournament] = useState("All Tournaments");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [started, setStarted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const configRef = useRef<HTMLDivElement>(null);
  const configInView = useInView(configRef, { once: true, margin: "-40px" });

  // Rotate loading messages while generating
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const startGame = async () => {
    audio.unlock();
    audio.click();

    // Enforce player sign up / sign in before starting quiz
    if (!user) {
      openAuthModal("signup", "/play");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setLoadingPhraseIndex(0);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const excludeStems = getSeenStems(150);
      const excludeAnswers = getSeenAnswers(80);

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sport,
          difficulty,
          count,
          category: selectedTournament !== "All Tournaments" && selectedTournament !== "All Events" && selectedTournament !== "All Grand Prix" ? selectedTournament : undefined,
          mode: "classic",
          excludeStems,
          excludeAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.message || data.error || "Failed to generate valid questions.");
      }

      // Mark questions as seen permanently to guarantee zero repetition across 100+ games
      recordQuestionsAsSeen(data.questions);

      useQuizStore.getState().start(data.questions, {
        sport,
        difficulty,
        mode: "classic",
        sessionId: data.sessionId,
      });

      trackEvent("game_started", { sport, difficulty, count, mode: "classic", sessionId: data.sessionId });
      audio.select();
      setStarted(true);
    } catch (err) {
      console.error("Quiz generation failed:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Unable to generate questions at this time. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (started) return <QuizGame onExit={() => setStarted(false)} />;

  return (
    <main className="arena-container pb-16">
      <div className="pt-10 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors"
        >
          <ArrowLeft size={15} /> Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.9, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 arena-eyebrow mt-8">
            <Sparkles size={14} className="text-arena-accent" />
            <span>AI Powered Trivia</span>
          </div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2 font-bold">
            Build your round.
          </h1>
          <p className="text-arena-muted max-w-[650px] mt-3 leading-relaxed">
            Choose your sport, question count and intensity. Fresh, verified questions are synthesized dynamically by AI specifically for your profile.
          </p>
        </motion.div>
      </div>

      {generationError && (
        <motion.div
          className="arena-notice mb-6"
          data-variant="error"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-arena-bad flex-shrink-0" />
              <span className="text-sm font-medium">{generationError}</span>
            </div>
            <button
              onClick={startGame}
              className="arena-btn arena-btn-ghost text-xs px-2.5 py-1 text-arena-accent hover:bg-arena-accent/10 ml-4"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" ref={configRef}>
        {/* Sport Selection */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 20 }}
          animate={configInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <div className="arena-eyebrow">1 · Sport</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
            What are we playing?
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              className="arena-card arena-tile arena-card-shine p-3.5 relative"
              data-active={sport === "All Sports" ? "true" : undefined}
              onClick={() => {
                setSport("All Sports");
                setSelectedTournament("All Tournaments");
                audio.select();
              }}
            >
              <div className="text-2xl mb-1">🌍</div>
              <div className="font-semibold text-sm">All Sports</div>
              <div className="text-[11px] text-arena-muted">Curated mix</div>
              {sport === "All Sports" && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-arena-accent text-arena-bg grid place-items-center">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
            {SPORT_LIST.map((s) => {
              const meta = SPORT_META[s];
              const active = sport === s;
              return (
                <button
                  key={s}
                  className="arena-card arena-tile arena-card-shine p-3.5 relative"
                  data-active={active ? "true" : undefined}
                  onClick={() => {
                    setSport(s);
                    setSelectedTournament(TOURNAMENTS_BY_SPORT[s]?.[0] || "All Tournaments");
                    audio.select();
                  }}
                >
                  <div className="text-2xl mb-1">{meta.icon}</div>
                  <div className="font-semibold text-sm">{s === "Football" ? "Football (Soccer)" : s}</div>
                  <div className="text-[11px] text-arena-muted">{s === "Football" ? "FIFA & Clubs" : "AI generated"}</div>
                  {active && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-arena-accent text-arena-bg grid place-items-center">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tournament / League Selection Option */}
          {sport !== "All Sports" && TOURNAMENTS_BY_SPORT[sport] && (
            <div className="mt-4 pt-4 border-t border-arena-line/60">
              <div className="text-xs font-semibold uppercase tracking-wider text-arena-muted mb-2 flex items-center gap-1.5">
                <span>🏆</span> Choose Tournament / League
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TOURNAMENTS_BY_SPORT[sport].map((t) => {
                  const isTActive = selectedTournament === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                        isTActive
                          ? "bg-arena-accent/20 border-arena-accent text-arena-accent font-semibold shadow-[0_0_12px_rgba(0,212,255,0.25)]"
                          : "bg-white/[.03] border-arena-line text-arena-muted hover:text-arena-text hover:bg-white/[.06]"
                      }`}
                      onClick={() => {
                        setSelectedTournament(t);
                        audio.tap();
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Difficulty & Count Selection */}
        <div className="flex flex-col gap-4">
          {/* Difficulty */}
          <motion.div
            className="arena-card"
            initial={{ opacity: 0, y: 20 }}
            animate={configInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="arena-eyebrow">2 · Difficulty</div>
            <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
              Set the bar
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(["Mixed", ...DIFFICULTY_LIST] as const).map((d) => {
                const active = difficulty === d;
                const color = diffColors[d];
                return (
                  <button
                    key={d}
                    className="arena-card arena-tile p-3 text-center relative"
                    data-active={active ? "true" : undefined}
                    onClick={() => {
                      setDifficulty(d);
                      audio.select();
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mx-auto mb-1.5"
                      style={{ backgroundColor: color }}
                    />
                    <div className="font-semibold text-xs">{d}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-arena-muted mt-3">
              {diffDescriptions[difficulty]}
            </p>
          </motion.div>

          {/* Question Count */}
          <motion.div
            className="arena-card"
            initial={{ opacity: 0, y: 20 }}
            animate={configInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="arena-eyebrow">3 · Length</div>
            <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
              How many questions?
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {counts.map((c) => {
                const active = count === c;
                return (
                  <button
                    key={c}
                    className="arena-card arena-tile py-3 text-center relative font-display font-bold text-base"
                    data-active={active ? "true" : undefined}
                    onClick={() => {
                      setCount(c);
                      audio.select();
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Start Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={configInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <button
              onClick={startGame}
              disabled={isGenerating}
              className="arena-btn arena-btn-primary w-full py-4 text-base font-bold justify-center shadow-[0_0_40px_rgba(0,212,255,0.25)] relative overflow-hidden"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin text-arena-bg" />
                  <span>Synthesizing Round...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Play size={18} fill="currentColor" />
                  <span>Start Quiz</span>
                </div>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-arena-muted mt-2.5 px-1">
              <span>{user ? `Personalized for ${user.email?.split("@")[0]}` : "Guest Mode (Sign in to track progress)"}</span>
              <span>Zero repeat guarantee</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Loading Overlay Modal */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="arena-card max-w-md w-full text-center p-8 border-arena-accent/40 shadow-[0_0_60px_rgba(0,212,255,0.15)]"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-arena-accent/15 border border-arena-accent/30 grid place-items-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,212,255,0.25)]">
                <Sparkles size={28} className="text-arena-accent animate-pulse" />
              </div>

              <div className="arena-eyebrow mb-2 justify-center">AI Generation Engine</div>
              <h3 className="font-display text-2xl font-bold mb-3">
                Crafting Your Challenge
              </h3>

              <div className="h-10 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingPhraseIndex}
                    className="text-sm text-arena-muted font-medium"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {loadingPhrases[loadingPhraseIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/[.06] rounded-full h-1.5 mt-6 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-arena-accent to-arena-accent2 rounded-full"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayContent />
    </Suspense>
  );
}
