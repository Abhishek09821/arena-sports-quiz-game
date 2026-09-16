"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X, Zap, Flame } from "lucide-react";
import { useQuizStore } from "@/lib/store";
import { audio } from "@/lib/audio";
import { buildGame } from "@/lib/quiz";
import { SPORT_LIST, type Sport, type Difficulty } from "@/data/questions";
import ResultsScreen from "@/components/ResultsScreen";
import { useAuth } from "@/components/AuthContext";

const letters = ["A", "B", "C", "D"] as const;

function SprintTimerRing({ time, urgent }: { time: number; urgent: boolean }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = time / 60;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="arena-timer-ring" data-urgent={urgent ? "true" : undefined}>
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="sprint-timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={urgent ? "#ff4d6a" : "#f59e0b"} />
            <stop offset="100%" stopColor={urgent ? "#ff8a3d" : "#00d4ff"} />
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
          style={{ stroke: `url(#sprint-timer-gradient)` }}
        />
      </svg>
      <div className="timer-value">
        <span className={urgent ? "text-arena-bad" : "text-arena-warn"}>{time}</span>
      </div>
    </div>
  );
}

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

  const { user, openAuthModal } = useAuth();
  const [finished, setFinished] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sprintSport, setSprintSport] = useState<Sport | "All Sports">("All Sports");
  const [sprintDifficulty, setSprintDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sprint with a large pool of questions
  const startSprint = useCallback(() => {
    audio.unlock();
    if (!user) {
      openAuthModal("signup", "/sprint");
      return;
    }
    // Start 3-2-1 countdown
    setCountdown(3);
  }, [user, openAuthModal]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const pool = buildGame({ sport: sprintSport, difficulty: sprintDifficulty, count: 60 });
      start(pool, { sport: sprintSport, difficulty: sprintDifficulty, mode: "sprint" });
      setGameStarted(true);
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      audio.tick();
    }, 800);
    return () => clearTimeout(timer);
  }, [countdown, start, sprintSport, sprintDifficulty]);

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

  // Keyboard navigation for Sprint mode (1-4 / A-D for rapid-fire answers, Enter/Space to start)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (!gameStarted && countdown === null && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startSprint();
        return;
      }

      if (gameStarted && !locked && !finished) {
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, locked, finished, startSprint, handleAnswer, countdown]);

  if (finished) {
    return <ResultsScreen onPlayAgain={onExit} />;
  }

  // 3-2-1 Countdown overlay
  if (countdown !== null) {
    return (
      <div className="arena-container min-h-[70vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            className="text-center"
            initial={{ scale: 0.5, opacity: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.9, 0.3, 1] }}
          >
            <div className="font-display text-[clamp(100px,25vw,200px)] font-bold tracking-tight arena-gradient-text">
              {countdown === 0 ? "GO" : countdown}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="arena-container min-h-[75vh] flex items-center justify-center py-10">
        <motion.div
          className="text-center max-w-xl w-full arena-card arena-card-shine p-6 sm:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
        >
          <div className="arena-eyebrow mb-3 justify-center">60 Second Sprint</div>
          <h1 className="font-display text-4xl sm:text-6xl tracking-tight mb-3 font-bold">
            Answer fast.<br />
            <span className="arena-gradient-text">Score big.</span>
          </h1>
          <p className="text-arena-muted text-sm mb-6 max-w-md mx-auto leading-relaxed">
            60 seconds on the clock. Continuous rapid-fire questions.
            Wrong answers cost you nothing but time. Choose your sport & difficulty below!
          </p>

          {/* Sport Selector */}
          <div className="text-left mb-4">
            <label className="block text-xs font-semibold text-arena-muted uppercase tracking-wider mb-1.5">
              Sport Category
            </label>
            <select
              className="arena-input text-sm"
              value={sprintSport}
              onChange={(e) => setSprintSport(e.target.value as Sport | "All Sports")}
            >
              <option value="All Sports" className="bg-arena-panel">All Sports (Multi-Sport Sprint)</option>
              {SPORT_LIST.map((s) => (
                <option key={s} value={s} className="bg-arena-panel">
                  {s === "Football" ? "Football (Soccer)" : s}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Selector */}
          <div className="text-left mb-6">
            <label className="block text-xs font-semibold text-arena-muted uppercase tracking-wider mb-1.5">
              Difficulty Tier
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(["Easy", "Medium", "Hard", "Legendary", "Mixed"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSprintDifficulty(d); audio.click(); }}
                  className={`py-2 px-1 text-xs rounded-xl font-bold transition-all border text-center ${
                    sprintDifficulty === d
                      ? "bg-arena-accent/20 border-arena-accent text-arena-accent shadow-[0_0_15px_rgba(0,212,255,0.25)]"
                      : "bg-white/[.02] border-arena-line text-arena-muted hover:text-arena-text hover:border-white/20"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            className="arena-btn arena-btn-primary text-base sm:text-lg w-full justify-center py-3.5 sm:py-4"
            onClick={startSprint}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap size={20} />
            Start {sprintDifficulty} {sprintSport === "All Sports" ? "Sprint" : `${sprintSport} Sprint`}
          </motion.button>
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
        <div className="flex gap-2.5 items-center">
          <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
            Score <span className="text-arena-accent font-display text-lg">{score}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
            <span className="text-arena-good">{correct}</span>
            {" / "}
            <span className="text-arena-bad">{wrong}</span>
          </div>
          {streak >= 2 && (
            <motion.div
              className="px-3 py-1.5 rounded-xl border border-arena-warn/25 bg-arena-warn/8 text-sm font-bold text-arena-warn flex items-center gap-1.5"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={streak}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Flame size={14} />
              {streak}×
            </motion.div>
          )}
        </div>

        {/* SVG Timer Ring */}
        <SprintTimerRing time={sprintTimeLeft} urgent={sprintTimeLeft <= 10} />
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
          initial={{ opacity: 0, x: 40, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.2, 0.9, 0.3, 1] }}
        >
          <div className="flex gap-2 items-center mb-3">
            <span className="arena-pill">{q.sport}</span>
            <span className="arena-pill">{q.difficulty}</span>
          </div>

          <h2 className="font-display text-[clamp(20px,3.5vw,34px)] leading-[1.12] tracking-tight max-w-[920px] mb-5 font-bold">
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
                  whileTap={!locked ? { scale: 0.98 } : undefined}
                  className="arena-answer"
                  data-state={state || undefined}
                  onClick={() => handleAnswer(i)}
                  disabled={locked}
                >
                  <span className="arena-answer-key">{letters[i]}</span>
                  <span className="flex-1 text-[14px]">{option}</span>
                  {locked && i === q.answer && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                      <Check size={16} className="text-arena-good flex-shrink-0" />
                    </motion.span>
                  )}
                  {locked && i === selected && i !== q.answer && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                      <X size={16} className="text-arena-bad flex-shrink-0" />
                    </motion.span>
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
