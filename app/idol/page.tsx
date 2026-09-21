"use client";

import { useSportTheme } from "@/components/ThemeProvider";

import { useState, Suspense, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { audio } from "@/lib/audio";
import {
  SPORT_LIST,
  SPORT_META,
  DIFFICULTY_LIST,
  IDOL_BY_SPORT,
  type Difficulty,
  type Sport,
} from "@/data/questions";
import { useQuizStore } from "@/lib/store";
import { useAuth } from "@/components/AuthContext";
import { trackEvent } from "@/lib/analytics";
import QuizGame from "@/components/QuizGame";
import { getSeenStems, getSeenAnswers, recordQuestionsAsSeen } from "@/lib/seen_history";
import { ArrowLeft, Play, Sparkles, Loader2, AlertTriangle, RefreshCw, Star, User } from "lucide-react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "motion/react";

const loadingPhrases = [
  "Researching career highlights & milestones...",
  "Mining verified stats and records...",
  "Crafting questions about their iconic moments...",
  "Validating historical accuracy...",
  "Preparing your Know Your Idol challenge...",
];

const diffDescriptions: Record<Difficulty | "Mixed", string> = {
  Mixed: "Curated difficulty mix",
  Easy: "Famous moments & records",
  Medium: "Career milestones & stats",
  Hard: "Deep-cut career facts",
  Legendary: "Only true superfans know",
};

const diffColors: Record<Difficulty | "Mixed", string> = {
  Mixed: "#00d4ff",
  Easy: "#22d37e",
  Medium: "#f59e0b",
  Hard: "#fb923c",
  Legendary: "#ff4d6a",
};

function IdolContent() {
  const { token, user, openAuthModal } = useAuth();
  const searchParams = useSearchParams();
  const paramSport = searchParams.get("sport") as Sport;
  const initialSport = SPORT_LIST.includes(paramSport) ? paramSport : "Cricket";
  const [sport, setSport] = useState<Sport>(initialSport);
  useSportTheme(sport);
  const [selectedIdol, setSelectedIdol] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [count, setCount] = useState(10);
  const [started, setStarted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const configRef = useRef<HTMLDivElement>(null);
  const configInView = useInView(configRef, { once: true, margin: "-40px" });

  const start = useQuizStore((s) => s.start);

  const idolList = IDOL_BY_SPORT[sport] || [];

  // Auto-select first idol when sport changes
  useEffect(() => {
    const list = IDOL_BY_SPORT[sport] || [];
    if (list.length > 0) {
      setSelectedIdol(list[0].name);
    } else {
      setSelectedIdol("");
    }
  }, [sport]);

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

    if (!user) {
      openAuthModal("signup", "/idol");
      return;
    }

    if (!selectedIdol) {
      setGenerationError("Please select an idol to begin.");
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

      const excludeStems = getSeenStems();
      const excludeAnswers = getSeenAnswers(80);

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sport,
          difficulty,
          count,
          mode: "idol",
          idol: selectedIdol,
          excludeStems,
          excludeAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data?.message || data?.error || "Failed to generate idol questions. Please try again.");
      }

      recordQuestionsAsSeen(data.questions);

      start(data.questions, {
        sport,
        difficulty,
        mode: "idol",
      });

      trackEvent("game_started", { sport, difficulty, count, mode: "idol", idol: selectedIdol, sessionId: data.sessionId });
      audio.select();
      setStarted(true);
    } catch (err) {
      console.error("Idol quiz generation failed:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Unable to generate questions at this time. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (started) return <QuizGame onExit={() => setStarted(false)} />;

  const selectedIdolData = idolList.find((p) => p.name === selectedIdol);

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
            <Star size={14} className="text-amber-400" />
            <span>Know Your Idol</span>
          </div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2 font-bold">
            How well do you<br />know your legend?
          </h1>
          <p className="text-arena-muted max-w-[650px] mt-3 leading-relaxed">
            Pick a sport, choose an all-time great, and test your knowledge about their career, records, iconic moments, and milestones.
          </p>
        </motion.div>
      </div>

      {generationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
        >
          <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">Generation Error</p>
            <p className="text-xs text-red-400/80 mt-0.5">{generationError}</p>
          </div>
          <button
            onClick={() => setGenerationError(null)}
            className="text-red-400/60 hover:text-red-300 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </motion.div>
      )}

      <div ref={configRef} className="grid gap-5 max-w-[780px]">
        {/* Sport Selector */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 20 }}
          animate={configInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0, duration: 0.4 }}
        >
          <div className="arena-eyebrow">1 · Sport</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
            Choose your sport
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SPORT_LIST.map((s) => {
              const meta = SPORT_META[s];
              const active = sport === s;
              return (
                <button
                  key={s}
                  className="arena-card arena-tile text-center relative py-3"
                  data-active={active ? "true" : undefined}
                  onClick={() => {
                    setSport(s);
                    audio.select();
                  }}
                >
                  <div className="text-2xl mb-1">{meta.icon}</div>
                  <div className="font-semibold text-xs">{s}</div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Idol Selector */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 20 }}
          animate={configInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <div className="arena-eyebrow">2 · Legend</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
            Pick your idol
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {idolList.map((idol) => {
              const active = selectedIdol === idol.name;
              return (
                <button
                  key={idol.name}
                  className="arena-card arena-tile text-center relative py-3 px-2"
                  data-active={active ? "true" : undefined}
                  onClick={() => {
                    setSelectedIdol(idol.name);
                    audio.select();
                  }}
                >
                  <div className="text-lg mb-0.5">
                    <User size={18} className="inline-block text-arena-accent" />
                  </div>
                  <div className="font-semibold text-xs leading-tight">{idol.name}</div>
                  {idol.nickname && (
                    <div className="text-[10px] text-arena-muted mt-0.5">&ldquo;{idol.nickname}&rdquo;</div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedIdolData && (
            <div className="mt-3 p-3 rounded-xl bg-arena-accent/5 border border-arena-accent/20">
              <p className="text-xs text-arena-muted">
                <span className="text-arena-accent font-bold">{selectedIdolData.name}</span>
                {selectedIdolData.nickname && ` "${selectedIdolData.nickname}"`}
                {` · Active: ${selectedIdolData.era}`}
              </p>
            </div>
          )}
        </motion.div>

        {/* Difficulty Selector */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 20 }}
          animate={configInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="arena-eyebrow">3 · Difficulty</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
            Set the intensity
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(["Mixed", ...DIFFICULTY_LIST] as (Difficulty | "Mixed")[]).map((d) => {
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  className="arena-card arena-tile text-center relative"
                  data-active={active ? "true" : undefined}
                  onClick={() => {
                    setDifficulty(d);
                    audio.select();
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full mx-auto mb-1.5"
                    style={{ background: diffColors[d] }}
                  />
                  <div className="font-semibold text-xs">{d}</div>
                  <div className="text-[10px] text-arena-muted mt-0.5">
                    {diffDescriptions[d]}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Question Count */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 20 }}
          animate={configInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.12, duration: 0.4 }}
        >
          <div className="arena-eyebrow">4 · Length</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
            How many questions?
          </h3>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 20].map((n) => {
              const active = count === n;
              return (
                <button
                  key={n}
                  className="arena-card arena-tile w-16 h-14 flex items-center justify-center relative"
                  data-active={active ? "true" : undefined}
                  onClick={() => {
                    setCount(n);
                    audio.select();
                  }}
                >
                  <span className="font-display font-bold text-lg">{n}</span>
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
          <motion.button
            className="arena-btn arena-btn-primary text-base sm:text-lg w-full justify-center py-3.5 sm:py-4 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={startGame}
            disabled={isGenerating || !selectedIdol}
            whileHover={{ scale: isGenerating ? 1 : 1.02 }}
            whileTap={{ scale: isGenerating ? 1 : 0.98 }}
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5"
                >
                  <Loader2 size={20} className="animate-spin text-arena-accent" />
                  <span className="text-sm sm:text-base">{loadingPhrases[loadingPhraseIndex]}</span>
                </motion.span>
              ) : (
                <motion.span
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Play size={18} />
                  {selectedIdol
                    ? `Test Your Knowledge: ${selectedIdol}`
                    : "Select an Idol to Begin"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
    </main>
  );
}

export default function IdolPage() {
  return (
    <Suspense
      fallback={
        <div className="arena-container pt-20 text-center">
          <Loader2 className="animate-spin mx-auto text-arena-accent" size={28} />
        </div>
      }
    >
      <IdolContent />
    </Suspense>
  );
}
