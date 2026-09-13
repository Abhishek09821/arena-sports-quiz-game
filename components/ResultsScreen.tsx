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
} from "lucide-react";
import Link from "next/link";
import { audio } from "@/lib/audio";
import { DIFFICULTY_LIST, type Difficulty } from "@/data/questions";

interface ResultsScreenProps {
  onPlayAgain?: () => void;
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
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Score Header */}
        <div className="text-center mb-8">
          <motion.div
            className="arena-eyebrow mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {mode === "sprint" ? "Sprint Complete" : "Round Complete"}
          </motion.div>

          <motion.div
            className="font-display text-[clamp(72px,15vw,140px)] leading-none tracking-[-0.08em] bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          >
            {score}
          </motion.div>

          <motion.p
            className="text-lg text-arena-muted mt-2 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {getMessage()}
          </motion.p>
        </div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <StatCard
            icon={<Target size={18} />}
            label="Accuracy"
            value={`${accuracy}%`}
            color={isGood ? "text-arena-good" : "text-arena-bad"}
          />
          <StatCard
            icon={<Trophy size={18} />}
            label="Correct"
            value={`${correct}/${total}`}
            color="text-arena-accent"
          />
          <StatCard
            icon={<Flame size={18} />}
            label="Best Streak"
            value={`${bestStreak}×`}
            color="text-arena-warn"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Avg. Time"
            value={`${avgTime}s`}
            color="text-arena-accent2"
          />
        </motion.div>

        {/* Difficulty Breakdown */}
        {diffBreakdown.length > 1 && (
          <motion.div
            className="arena-card mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-arena-muted" />
              <span className="text-sm font-semibold text-arena-muted">
                Difficulty Breakdown
              </span>
            </div>
            <div className="grid gap-2">
              {diffBreakdown.map(({ difficulty, total: t, correct: c }) => (
                <div
                  key={difficulty}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <DifficultyDot difficulty={difficulty} />
                    <span className="text-sm font-medium">{difficulty}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-white/[.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-arena-accent to-arena-accent2 transition-all duration-500"
                        style={{
                          width: `${t > 0 ? (c / t) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-arena-muted w-12 text-right">
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
          transition={{ delay: 0.5 }}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="arena-card text-center py-4">
      <div className="flex justify-center mb-2 text-arena-muted">{icon}</div>
      <div className={`font-display text-2xl font-bold tracking-tight ${color}`}>
        {value}
      </div>
      <div className="text-xs text-arena-muted mt-1 uppercase tracking-wider font-semibold">
        {label}
      </div>
    </div>
  );
}

function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  const colors: Record<Difficulty, string> = {
    Easy: "bg-arena-good",
    Medium: "bg-arena-warn",
    Hard: "bg-orange-500",
    Legendary: "bg-arena-bad",
  };
  return <div className={`w-2 h-2 rounded-full ${colors[difficulty]}`} />;
}
