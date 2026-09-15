"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, X, Volume2, Flame } from "lucide-react";
import { useQuizStore } from "@/lib/store";
import { audio } from "@/lib/audio";
import { getTimeLimit } from "@/lib/scoring";
import ResultsScreen from "@/components/ResultsScreen";

const letters = ["A", "B", "C", "D"] as const;

function TimerRing({ time, total, urgent }: { time: number; total: number; urgent: boolean }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? time / total : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="arena-timer-ring" data-urgent={urgent ? "true" : undefined}>
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={urgent ? "#ff4d6a" : "#00d4ff"} />
            <stop offset="100%" stopColor={urgent ? "#ff8a3d" : "#a855f7"} />
          </linearGradient>
        </defs>
        <circle className="ring-bg" cx="50" cy="50" r={radius} />
        <circle
          className="ring-fg"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="timer-value">
        <span className={urgent ? "text-arena-bad" : ""}>{time}</span>
      </div>
    </div>
  );
}

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

      // Persist answer progress to Supabase
      const state = useQuizStore.getState();
      if (state.sessionId && q) {
        fetch("/api/quiz/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.sessionId,
            questionId: q.id,
            selectedOption: i,
            correctOption: q.answer,
            isCorrect: ok,
            timeLeft: time,
            pointsEarned: state.answerHistory[state.answerHistory.length - 1]?.pointsEarned || 0,
          }),
        }).catch(() => {});
      }
    },
    [locked, choose, time, q]
  );

  const handleNext = useCallback(() => {
    audio.click();
    if (isLast) {
      setFinished(true);
      const state = useQuizStore.getState();
      const finalCorrect = state.correct;
      const finalTotal = state.questions.length;
      if (finalCorrect >= finalTotal * 0.7) {
        audio.win();
      } else {
        audio.lose();
      }

      // Persist session completion to Supabase
      if (state.sessionId) {
        fetch("/api/quiz/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.sessionId,
            score: state.score,
            accuracy: finalTotal > 0 ? (finalCorrect / finalTotal) * 100 : 0,
            correctCount: finalCorrect,
            wrongCount: state.wrong,
            bestStreak: state.bestStreak,
            totalTimeSeconds: state.totalTimeTaken,
          }),
        }).catch(() => {});
      }
    } else {
      next();
    }
  }, [isLast, next]);

  // Keyboard navigation (Keys 1-4, A-D for options; Enter/Space for next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (!locked) {
        if (e.key === "1" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          handleAnswer(0);
        } else if (e.key === "2" || e.key === "b" || e.key === "B") {
          e.preventDefault();
          handleAnswer(1);
        } else if (e.key === "3" || e.key === "c" || e.key === "C") {
          e.preventDefault();
          handleAnswer(2);
        } else if (e.key === "4" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          handleAnswer(3);
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locked, handleAnswer, handleNext]);

  if (finished) {
    return <ResultsScreen onPlayAgain={onExit} />;
  }

  if (!q) return null;

  return (
    <div className="arena-container min-h-screen pb-16">
      {/* Top Bar */}
      <div className="flex justify-between items-center py-5">
        <div>
          <motion.div
            className="arena-eyebrow"
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            Question {index + 1} / {questions.length}
          </motion.div>
          <div className="flex gap-2.5 mt-2.5">
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
              Score <span className="text-arena-accent font-display">{score}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
              {streak >= 3 ? (
                <motion.span
                  className="text-arena-warn flex items-center gap-1"
                  key={streak}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Flame size={14} />
                  {streak}×
                </motion.span>
              ) : (
                <span>
                  Streak <span className="text-arena-accent">{streak}×</span>
                </span>
              )}
            </div>
            <div className="hidden sm:block px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
              <span className="text-arena-good">{correct}</span>
              {" / "}
              <span className="text-arena-bad">{wrong}</span>
            </div>
          </div>
        </div>

        {/* SVG Timer Ring */}
        <TimerRing time={time} total={timeLimit} urgent={time <= 5} />
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
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.2, 0.9, 0.3, 1] }}
        >
          {/* Meta pills */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="arena-pill">{q.sport}</span>
            <span className="arena-pill">{q.year}</span>
            <span className="arena-pill">{q.difficulty}</span>
          </div>

          {/* Question text */}
          <h2 className="font-display text-[clamp(22px,4vw,40px)] leading-[1.1] tracking-tight max-w-[920px] my-6 font-bold">
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
                  whileTap={!locked ? { scale: 0.98 } : undefined}
                  className="arena-answer"
                  data-state={state || undefined}
                  onClick={() => handleAnswer(i)}
                  disabled={locked}
                  aria-label={`Option ${letters[i]}: ${option}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i + 0.1, duration: 0.3 }}
                >
                  <span className="arena-answer-key">{letters[i]}</span>
                  <span className="flex-1 text-[15px]">{option}</span>
                  {locked && i === q.answer && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Check size={18} className="text-arena-good flex-shrink-0" />
                    </motion.span>
                  )}
                  {locked && i === selected && i !== q.answer && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <X size={18} className="text-arena-bad flex-shrink-0" />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          {locked && (
            <motion.div
              className="arena-explanation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
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
            <div className="text-xs text-arena-muted/50 flex items-center gap-1.5">
              <Volume2 size={12} />
              Sound cues active
            </div>
            {locked && (
              <motion.button
                className="arena-btn arena-btn-primary"
                onClick={handleNext}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLast ? "See results" : "Next question"}
                <span className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded text-[10px] tracking-wide bg-black/20 text-white/70 font-mono">
                  Enter ↵
                </span>
                <ChevronRight size={17} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
