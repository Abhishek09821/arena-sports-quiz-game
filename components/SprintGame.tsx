"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock3, X, Zap } from "lucide-react";
import { useQuizStore } from "@/lib/store";
import { audio } from "@/lib/audio";
import { buildGame } from "@/lib/quiz";
import ResultsScreen from "@/components/ResultsScreen";

const letters = ["A", "B", "C", "D"] as const;

export default function SprintGame({ onExit }: { onExit?: () => void }) {
  const {
    questions,
    index,
    score,
    streak,
    correct,
    wrong,
    selected,
    locked,
    choose,
    next,
    start,
    sprintTimeLeft,
    setSprintTime,
    incrementSprintAttempts,
  } = useQuizStore();

  const [finished, setFinished] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sprint with a large pool of questions
  const startSprint = useCallback(() => {
    audio.unlock();
    const pool = buildGame({ sport: "All Sports", difficulty: "Mixed", count: 60 });
    start(pool, { sport: "All Sports", difficulty: "Mixed", mode: "sprint" });
    setGameStarted(true);
  }, [start]);

  // Sprint countdown (60 seconds total)
  useEffect(() => {
    if (!gameStarted || finished) return;

    timerRef.current = setInterval(() => {
      const s = useQuizStore.getState();
      const newTime = s.sprintTimeLeft - 1;

      if (newTime <= 0) {
        setSprintTime(0);
        setFinished(true);
        const finalCorrect = useQuizStore.getState().correct;
        if (finalCorrect >= 10) {
          audio.win();
        } else {
          audio.lose();
        }
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      setSprintTime(newTime);

      // Audio cues
      if (newTime <= 10 && newTime > 5) audio.tick();
      if (newTime <= 5 && newTime > 0) audio.urgentTick();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, finished, setSprintTime]);

  const q = questions[index];

  const handleAnswer = useCallback(
    (i: number) => {
      if (locked || finished) return;
      audio.unlock();
      incrementSprintAttempts();
      const ok = choose(i, sprintTimeLeft);
      if (ok) {
        audio.correct();
        if (useQuizStore.getState().streak >= 3) {
          audio.streak(useQuizStore.getState().streak);
        }
      } else {
        audio.wrong();
      }

      // Auto-advance after brief delay in sprint mode
      setTimeout(() => {
        if (useQuizStore.getState().sprintTimeLeft > 0) {
          const state = useQuizStore.getState();
          if (state.index < state.questions.length - 1) {
            next();
          } else {
            // Ran out of questions
            setFinished(true);
            audio.roundComplete();
          }
        }
      }, 600);
    },
    [locked, finished, choose, sprintTimeLeft, next, incrementSprintAttempts]
  );

  if (finished) {
    return <ResultsScreen onPlayAgain={onExit} />;
  }

  if (!gameStarted) {
    return (
      <div className="arena-container min-h-[70vh] flex items-center justify-center">
        <motion.div
          className="text-center max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="arena-eyebrow mb-4">60 Second Sprint</div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-tight mb-4">
            Answer fast.<br />
            <span className="text-arena-accent">Score big.</span>
          </h1>
          <p className="text-arena-muted mb-8 max-w-md mx-auto">
            60 seconds on the clock. Questions keep coming. Every correct answer scores.
            Wrong answers cost you nothing but time.
          </p>
          <button
            className="arena-btn arena-btn-primary text-lg px-8 py-4"
            onClick={startSprint}
          >
            <Zap size={20} />
            Start Sprint
          </button>
        </motion.div>
      </div>
    );
  }

  if (!q) return null;

  const progress = sprintTimeLeft > 0 ? (sprintTimeLeft / 60) * 100 : 0;

  return (
    <div className="arena-container min-h-screen pb-16">
      {/* Top Bar */}
      <div className="flex justify-between items-center py-4">
        <div className="flex gap-3 items-center">
          <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold">
            Score <span className="text-arena-accent font-display text-lg">{score}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold">
            <span className="text-arena-good">{correct}</span>
            {" / "}
            <span className="text-arena-bad">{wrong}</span>
          </div>
          {streak >= 2 && (
            <motion.div
              className="px-3 py-1.5 rounded-xl border border-arena-warn/30 bg-arena-warn/10 text-sm font-bold text-arena-warn"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={streak}
            >
              🔥 {streak}×
            </motion.div>
          )}
        </div>

        {/* Timer */}
        <div
          className="arena-timer"
          data-urgent={sprintTimeLeft <= 10 ? "true" : undefined}
          role="timer"
          aria-label={`${sprintTimeLeft} seconds remaining`}
        >
          <div className="flex flex-col items-center">
            <Clock3 size={14} className="mb-0.5 opacity-50" />
            <span>{sprintTimeLeft}</span>
          </div>
        </div>
      </div>

      {/* Progress (time remaining) */}
      <div className="arena-progress">
        <span
          style={{ width: `${progress}%` }}
          className={sprintTimeLeft <= 10 ? "!bg-gradient-to-r !from-arena-bad !to-orange-500" : ""}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id + "-" + index}
          className="arena-question-card mt-4"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <div className="flex gap-2 items-center mb-3">
            <span className="arena-pill">{q.sport}</span>
            <span className="arena-pill">{q.difficulty}</span>
          </div>

          <h2 className="font-display text-[clamp(20px,3.5vw,36px)] leading-[1.12] tracking-tight max-w-[920px] mb-5">
            {q.question}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="group" aria-label="Answer options">
            {q.options.map((option, i) => {
              const state = !locked
                ? ""
                : i === q.answer
                  ? "correct"
                  : i === selected
                    ? "wrong"
                    : "dim";

              return (
                <motion.button
                  key={`${q.id}-${i}`}
                  whileTap={!locked ? { scale: 0.985 } : undefined}
                  className="arena-answer"
                  data-state={state || undefined}
                  onClick={() => handleAnswer(i)}
                  disabled={locked}
                >
                  <span className="arena-answer-key">{letters[i]}</span>
                  <span className="flex-1 text-[14px]">{option}</span>
                  {locked && i === q.answer && (
                    <Check size={16} className="text-arena-good flex-shrink-0" />
                  )}
                  {locked && i === selected && i !== q.answer && (
                    <X size={16} className="text-arena-bad flex-shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
