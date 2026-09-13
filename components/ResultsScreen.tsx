"use client";

import { motion } from "motion/react";
import { useQuizStore } from "@/lib/store";
import {
  Trophy,
  Target,
  Flame,
  Clock,
  BarChart3,
  RotateCcw,
  Home,
  Share2,
  Zap,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { audio } from "@/lib/audio";
import { DIFFICULTY_LIST, type Difficulty } from "@/data/questions";
import { useMemo } from "react";

interface ResultsScreenProps {
  onPlayAgain?: () => void;
}

/* CSS-only confetti */
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["#00d4ff", "#a855f7", "#f59e0b", "#22d37e", "#ff4d6a", "#fff"];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      size: `${6 + Math.random() * 8}px`,
      rotation: `${Math.random() * 360}deg`,
    }));
  }, []);

  return (
    <div className="arena-confetti">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="arena-confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  );
}

export default function ResultsScreen({ onPlayAgain }: ResultsScreenProps) {
  const {
    score,
    correct,
    bestStreak,
    questions,
    answerHistory,
    mode,
    reset,
  } = useQuizStore();

  const total = questions.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isPerfect = correct === total;
  const isGood = accuracy >= 70;

  // Average answer time
  const answeredRecords = answerHistory.filter((r) => r.selectedOption >= 0);
  const avgTime =
    answeredRecords.length > 0
      ? (
          answeredRecords.reduce((sum, r) => {
            const limit =
              r.correct || r.selectedOption >= 0
                ? 30 - r.timeLeft
                : 30;
            return sum + limit;
          }, 0) / answeredRecords.length
        ).toFixed(1)
      : "0";

  // Difficulty breakdown
  const diffBreakdown = DIFFICULTY_LIST.map((diff) => {
    const qs = answerHistory.filter(
      (r) => questions.find((q) => q.id === r.questionId)?.difficulty === diff
    );
    const c = qs.filter((r) => r.correct).length;
    return { difficulty: diff, total: qs.length, correct: c };
  }).filter((d) => d.total > 0);

  const handlePlayAgain = () => {
    audio.click();
    reset();
    onPlayAgain?.();
  };

  const getMessage = () => {
    if (isPerfect) return "Perfect run. That was clinical.";
    if (accuracy >= 80) return "Outstanding performance. Elite knowledge.";
    if (accuracy >= 60) return "Strong run. Your sports brain is online.";
    if (accuracy >= 40) return "Solid effort. Another round awaits.";
    return "Everyone starts somewhere. Go again.";
  };

  return (
    <div className="arena-container min-h-[80vh] flex items-center justify-center py-12">
      {/* Confetti for good scores */}
      {isGood && <Confetti />}

      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
      >
        {/* Score Header */}
        <div className="text-center mb-10">
          <motion.div
            className="arena-eyebrow mb-4 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {isPerfect && <Sparkles size={14} className="text-arena-warn" />}
            {mode === "sprint" ? "Sprint Complete" : "Round Complete"}
          </motion.div>

          {/* Score with glow halo */}
          <div className="arena-glow-halo inline-block">
            <motion.div
              className="font-display text-[clamp(80px,18vw,160px)] leading-none tracking-[-0.08em] arena-score-reveal"
              style={{
                background: isGood
                  ? "linear-gradient(180deg, #fff 30%, rgba(0, 212, 255, 0.5))"
                  : "linear-gradient(180deg, #fff 30%, rgba(255, 77, 106, 0.4))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              initial={{ scale: 0.5, opacity: 0, filter: "blur(12px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 15 }}
            >
              {score}
            </motion.div>
          </div>

          <motion.p
            className="text-lg text-arena-muted mt-3 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {getMessage()}
          </motion.p>
        </div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <StatCard
            icon={<Target size={18} />}
            label="Accuracy"
            value={`${accuracy}%`}
            color={isGood ? "#22d37e" : "#ff4d6a"}
            delay={0.5}
          />
          <StatCard
            icon={<Trophy size={18} />}
            label="Correct"
            value={`${correct}/${total}`}
            color="#00d4ff"
            delay={0.55}
          />
          <StatCard
            icon={<Flame size={18} />}
            label="Best Streak"
            value={`${bestStreak}×`}
            color="#f59e0b"
            delay={0.6}
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Avg. Time"
            value={`${avgTime}s`}
            color="#a855f7"
            delay={0.65}
          />
        </motion.div>

        {/* Difficulty Breakdown */}
        {diffBreakdown.length > 1 && (
          <motion.div
            className="arena-card mb-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-arena-muted" />
              <span className="text-sm font-semibold text-arena-muted">
                Difficulty Breakdown
              </span>
            </div>
            <div className="grid gap-3">
              {diffBreakdown.map(({ difficulty, total: t, correct: c }) => (
                <div
                  key={difficulty}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <DifficultyDot difficulty={difficulty} />
                    <span className="text-sm font-medium">{difficulty}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36 h-2 bg-white/[.04] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg, var(--color-arena-accent), var(--color-arena-accent2))",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${t > 0 ? (c / t) * 100 : 0}%` }}
                        transition={{ delay: 0.7, duration: 0.8, ease: [0.2, 0.9, 0.3, 1] }}
                      />
                    </div>
                    <span className="text-sm text-arena-muted w-12 text-right font-medium">
                      {c}/{t}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="flex flex-wrap gap-3 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          <button
            className="arena-btn arena-btn-primary"
            onClick={handlePlayAgain}
          >
            <RotateCcw size={16} />
            Play Again
          </button>
          <Link
            href="/play"
            className="arena-btn arena-btn-ghost"
            onClick={() => {
              audio.navigate();
              reset();
            }}
          >
            <Zap size={16} />
            Change Mode
          </Link>
          <Link
            href="/challenge"
            className="arena-btn arena-btn-ghost"
            onClick={() => {
              audio.navigate();
              reset();
            }}
          >
            <Share2 size={16} />
            Challenge
          </Link>
          <Link
            href="/"
            className="arena-btn arena-btn-ghost"
            onClick={() => {
              audio.navigate();
              reset();
            }}
          >
            <Home size={16} />
            Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="arena-card arena-card-shine text-center py-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3 }}
    >
      <div className="flex justify-center mb-2.5" style={{ color }}>
        {icon}
      </div>
      <div
        className="font-display text-2xl font-bold tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[11px] text-arena-muted mt-1.5 uppercase tracking-wider font-semibold">
        {label}
      </div>
    </motion.div>
  );
}

function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  const colors: Record<Difficulty, string> = {
    Easy: "#22d37e",
    Medium: "#f59e0b",
    Hard: "#fb923c",
    Legendary: "#ff4d6a",
  };
  return (
    <div
      className="w-2.5 h-2.5 rounded-full"
      style={{ background: colors[difficulty], boxShadow: `0 0 8px ${colors[difficulty]}40` }}
    />
  );
}
