"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, Clock3, X, Volume2 } from "lucide-react";
import { useQuizStore } from "@/lib/store";
import { audio } from "@/lib/audio";
import { getTimeLimit } from "@/lib/scoring";
import ResultsScreen from "@/components/ResultsScreen";

const letters = ["A", "B", "C", "D"] as const;

export default function QuizGame({ onExit }: { onExit?: () => void }) {
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
  } = useQuizStore();

  const q = questions[index];
  const timeLimit = q ? getTimeLimit(q.difficulty) : 30;
  const [time, setTime] = useState(timeLimit);
  const [finished, setFinished] = useState(false);
  const timeoutRef = useRef(false);

  // Reset timer when question changes
  useEffect(() => {
    if (!q) return;
    const limit = getTimeLimit(q.difficulty);
    setTime(limit);
    setFinished(false);
    timeoutRef.current = false;
  }, [index, q]);

  // Countdown timer
  useEffect(() => {
    if (!q || locked || finished) return;
    const interval = setInterval(() => {
      setTime((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [q, locked, finished]);

  // Timer audio and timeout
  useEffect(() => {
    if (!q || locked || finished) return;
    if (time === 10) audio.tick();
    if (time > 0 && time <= 5) audio.urgentTick();
    if (time === 0 && !timeoutRef.current) {
      timeoutRef.current = true;
      choose(-1, 0);
      audio.timeout();
    }
  }, [time, q, locked, finished, choose]);

  const progress = q ? ((index + 1) / questions.length) * 100 : 0;
  const isCorrect = locked && selected === q?.answer;
  const isLast = index === questions.length - 1;

  const handleAnswer = useCallback(
    (i: number) => {
      if (locked) return;
      audio.unlock();
      const ok = choose(i, time);
      if (ok) {
        audio.correct();
        const currentStreak = useQuizStore.getState().streak;
        if (currentStreak >= 3) audio.streak(currentStreak);
      } else {
        audio.wrong();
      }
    },
    [locked, choose, time]
  );

  const handleNext = useCallback(() => {
    audio.click();
    if (isLast) {
      setFinished(true);
      const finalCorrect = useQuizStore.getState().correct;
      const finalTotal = useQuizStore.getState().questions.length;
      if (finalCorrect >= finalTotal * 0.7) {
        audio.win();
      } else {
        audio.lose();
      }
    } else {
      next();
    }
  }, [isLast, next]);

  if (finished) {
    return <ResultsScreen onPlayAgain={onExit} />;
  }

  if (!q) return null;

  return (
    <div className="arena-container min-h-screen pb-16">
      {/* Top Bar */}
      <div className="flex justify-between items-center py-5">
        <div>
          <div className="arena-eyebrow">
            Question {index + 1} / {questions.length}
          </div>
          <div className="flex gap-3 mt-2">
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold">
              Score <span className="text-arena-accent">{score}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold">
              Streak{" "}
              <span className={streak >= 3 ? "text-arena-warn" : "text-arena-accent"}>
                {streak}×
              </span>
            </div>
            <div className="hidden sm:block px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold">
              <span className="text-arena-good">{correct}</span>
              {" / "}
              <span className="text-arena-bad">{wrong}</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div
          className="arena-timer"
          data-urgent={time <= 5 ? "true" : undefined}
          role="timer"
          aria-label={`${time} seconds remaining`}
        >
          <div className="flex flex-col items-center">
            <Clock3 size={14} className="mb-0.5 opacity-50" />
            <span>{time}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="arena-progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          className="arena-question-card mt-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {/* Meta pills */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="arena-pill">{q.sport}</span>
            <span className="arena-pill">{q.year}</span>
            <span className="arena-pill">{q.difficulty}</span>
          </div>

          {/* Question text */}
          <h2 className="font-display text-[clamp(24px,4vw,42px)] leading-[1.1] tracking-tight max-w-[920px] my-6">
            {q.question}
          </h2>

          {/* Answer grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Answer options">
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
                  aria-label={`Option ${letters[i]}: ${option}`}
                >
                  <span className="arena-answer-key">{letters[i]}</span>
                  <span className="flex-1 text-[15px]">{option}</span>
                  {locked && i === q.answer && (
                    <Check size={18} className="text-arena-good flex-shrink-0" />
                  )}
                  {locked && i === selected && i !== q.answer && (
                    <X size={18} className="text-arena-bad flex-shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          {locked && (
            <motion.div
              className="arena-explanation"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <b className={isCorrect ? "text-arena-good" : "text-arena-bad"}>
                {isCorrect
                  ? "Correct!"
                  : selected === -1
                    ? "Time's up."
                    : "Not this time."}
              </b>{" "}
              {q.explanation}
            </motion.div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center mt-5 gap-3 flex-wrap">
            <div className="text-xs text-arena-muted flex items-center gap-1">
              <Volume2 size={13} />
              Sound cues active
            </div>
            {locked && (
              <motion.button
                className="arena-btn arena-btn-primary"
                onClick={handleNext}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLast ? "See results" : "Next question"}
                <ChevronRight size={17} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
