"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { audio } from "@/lib/audio";
import { buildGame, getAvailableCount } from "@/lib/quiz";
import { SPORT_LIST, SPORT_META, DIFFICULTY_LIST, type Difficulty, type Sport } from "@/data/questions";
import { useQuizStore } from "@/lib/store";
import { trackEvent } from "@/lib/analytics";
import QuizGame from "@/components/QuizGame";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

const counts = [5, 10, 15, 20];

const diffDescriptions: Record<Difficulty | "Mixed", string> = {
  Mixed: "Curated difficulty mix",
  Easy: "Great for warming up",
  Medium: "Balanced challenge",
  Hard: "Serious sports knowledge",
  Legendary: "Deep-cut facts & pressure timing",
};

function PlayContent() {
  const params = useSearchParams();
  const qs = params.get("sport");
  const initial = (SPORT_LIST.some((s) => s === qs) ? qs : "All Sports") as Sport | "All Sports";

  const [sport, setSport] = useState<Sport | "All Sports">(initial);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [started, setStarted] = useState(false);

  const available = getAvailableCount(sport, difficulty);

  const startGame = () => {
    audio.unlock();
    const questions = buildGame({ sport, difficulty, count });
    useQuizStore.getState().start(questions, { sport, difficulty, mode: "classic" });
    trackEvent("game_started", { sport, difficulty, count, mode: "classic" });
    setStarted(true);
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="arena-eyebrow mt-8">Classic Mode</div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2">
            Build your round.
          </h1>
          <p className="text-arena-muted max-w-[650px] mt-3">
            Choose the sport, question count and intensity. Every round shuffles the pool and scores speed.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sport Selection */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="arena-eyebrow">1 · Sport</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4">
            What are we playing?
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              className="arena-card arena-tile p-3"
              data-active={sport === "All Sports" ? "true" : undefined}
              onClick={() => { setSport("All Sports"); audio.select(); }}
            >
              <span className="text-xl">🌐</span>
              <div className="font-bold text-sm mt-1">All Sports</div>
              <div className="text-xs text-arena-muted">Mixed archive</div>
            </button>
            {SPORT_LIST.map((s) => (
              <button
                key={s}
                className="arena-card arena-tile p-3"
                data-active={sport === s ? "true" : undefined}
                onClick={() => { setSport(s); audio.select(); }}
              >
                <span className="text-xl">{SPORT_META[s].icon}</span>
                <div className="font-bold text-sm mt-1">{s}</div>
                <div className="text-xs text-arena-muted">1990–2026</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Count & Difficulty */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="arena-eyebrow">2 · Round Length</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4">
            How many questions?
          </h3>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {counts.map((n) => (
              <button
                key={n}
                className="arena-card arena-tile py-3 text-center"
                data-active={count === n ? "true" : undefined}
                onClick={() => { setCount(n); audio.select(); }}
              >
                <div className="font-display text-2xl font-bold">{n}</div>
                <div className="text-xs text-arena-muted">questions</div>
              </button>
            ))}
          </div>

          <div className="arena-eyebrow">3 · Difficulty</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4">
            How intense?
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(["Mixed", ...DIFFICULTY_LIST] as const).map((d) => (
              <button
                key={d}
                className="arena-card arena-tile p-3"
                data-active={difficulty === d ? "true" : undefined}
                onClick={() => { setDifficulty(d); audio.select(); }}
              >
                <span className="text-sm">
                  {d === "Mixed" ? "🎲" : d === "Easy" ? "🟢" : d === "Medium" ? "🟡" : d === "Hard" ? "🟠" : "🔴"}
                </span>
                <div className="font-bold text-sm mt-0.5">{d}</div>
                <div className="text-xs text-arena-muted">
                  {diffDescriptions[d]}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Start Card */}
      <motion.div
        className="arena-card mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div>
          <div className="arena-eyebrow">Ready?</div>
          <h3 className="font-display font-bold tracking-tight mt-1">
            {count} questions · {sport} · {difficulty}
          </h3>
          <div className="text-sm text-arena-muted mt-0.5">
            {available} questions available · No repeats within a round
          </div>
        </div>
        <button
          className="arena-btn arena-btn-primary w-full sm:w-auto"
          onClick={startGame}
          disabled={available === 0}
        >
          <Play size={17} />
          Start Round
        </button>
      </motion.div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="arena-container py-20"><div className="arena-skeleton h-12 w-48" /></div>}>
      <PlayContent />
    </Suspense>
  );
}
