"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuizStore } from "@/lib/store";
import { SPORT_LIST, TOURNAMENTS_BY_SPORT, DECADE_OPTIONS, type DecadeOption, type Question, type Sport, type Difficulty } from "@/data/questions";
import ResultsScreen from "@/components/ResultsScreen";
import { audio } from "@/lib/audio";
import { buildGame } from "@/lib/quiz";
import { getSeenStems, getSeenAnswers, recordQuestionsAsSeen } from "@/lib/seen_history";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Flame, Check, X, Loader2 } from "lucide-react";

const letters = ["A", "B", "C", "D"] as const;

function SprintTimerRing({ time, urgent }: { time: number; urgent: boolean }) {
  const radius = 24;
  const stroke = 3;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, time / 60);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`timer-ring ${urgent ? "urgent" : ""}`}>
      <svg width={56} height={56}>
        <circle
          cx={28}
          cy={28}
          r={radius}
          fill="none"
          stroke="var(--color-arena-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={28}
          cy={28}
          r={radius}
          fill="none"
          stroke={urgent ? "var(--color-arena-bad)" : "var(--color-arena-accent)"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
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
    locked,
    selected,
    choose,
    next,
    score,
    streak,
    correct,
    wrong,
    start,
    sprintTimeLeft,
    setSprintTime,
    incrementSprintAttempts,
    appendQuestions,
  } = useQuizStore();

  const [finished, setFinished] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sprintSport, setSprintSport] = useState<Sport | "All Sports">("All Sports");
  const [sprintTournament, setSprintTournament] = useState("All Tournaments");
  const [sprintDifficulty, setSprintDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [sprintDecade, setSprintDecade] = useState<DecadeOption>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sprintQuestions, setSprintQuestions] = useState<Question[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPrefetchingRef = useRef(false);

  // Background question pre-fetcher for continuous rapid-fire stream
  const fetchMoreQuestions = useCallback(async () => {
    if (isPrefetchingRef.current) return;
    const currentState = useQuizStore.getState();
    if (currentState.sprintTimeLeft <= 2) return;

    isPrefetchingRef.current = true;
    try {
      const recentStems = currentState.questions.slice(-30).map((q) => q.question.slice(0, 45));
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: sprintSport,
          difficulty: sprintDifficulty,
          count: 15,
          mode: "sprint",
          category:
            sprintTournament !== "All Tournaments" &&
            sprintTournament !== "All Events" &&
            sprintTournament !== "All Grand Prix"
              ? sprintTournament
              : undefined,
          excludeStems: [...getSeenStems(150), ...recentStems],
          excludeAnswers: getSeenAnswers(80),
          decade: sprintDecade !== "all" ? sprintDecade : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        appendQuestions(data.questions);
        recordQuestionsAsSeen(data.questions);
      }
    } catch (err) {
      console.warn("[Sprint] Background prefetch notice:", err);
    } finally {
      isPrefetchingRef.current = false;
    }
  }, [sprintSport, sprintDifficulty, sprintTournament, sprintDecade, appendQuestions]);

  // Initialize sprint with AI generated 25 questions via Groq
  const startSprint = useCallback(async () => {
    audio.unlock();
    audio.click();
    setIsGenerating(true);

    const activeTournament =
      sprintTournament !== "All Tournaments" &&
      sprintTournament !== "All Events" &&
      sprintTournament !== "All Grand Prix" &&
      !sprintTournament.startsWith("All")
        ? sprintTournament
        : undefined;

    try {
      const excludeStems = getSeenStems(150);
      const excludeAnswers = getSeenAnswers(80);
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: sprintSport,
          difficulty: sprintDifficulty,
          count: 25,
          category: activeTournament,
          mode: "sprint",
          excludeStems,
          excludeAnswers,
          decade: sprintDecade !== "all" ? sprintDecade : undefined,
        }),
      });

      const data = await res.json();
      let pool: Question[] = [];

      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        pool = data.questions;
        recordQuestionsAsSeen(pool);
      } else {
        // Resilient fallback if provider rate limits
        pool = buildGame({ sport: sprintSport, difficulty: sprintDifficulty, count: 25, category: activeTournament });
      }

      setSprintQuestions(pool);
      setIsGenerating(false);
      // Start 3-2-1 countdown
      setCountdown(3);
    } catch {
      const fallbackPool = buildGame({ sport: sprintSport, difficulty: sprintDifficulty, count: 25, category: activeTournament });
      setSprintQuestions(fallbackPool);
      setIsGenerating(false);
      setCountdown(3);
    }
  }, [sprintSport, sprintDifficulty, sprintTournament]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      start(sprintQuestions, { sport: sprintSport, difficulty: sprintDifficulty, mode: "sprint" });
      setGameStarted(true);
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      audio.tick();
    }, 800);
    return () => clearTimeout(timer);
  }, [countdown, start, sprintQuestions, sprintSport, sprintDifficulty]);

  // Sprint countdown (strictly 60 seconds total)
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

      // Check if we are running low on questions and pre-fetch more in the background
      const currentState = useQuizStore.getState();
      if (currentState.questions.length - currentState.index <= 8 && currentState.sprintTimeLeft > 3) {
        void fetchMoreQuestions();
      }

      // Rapid auto-advance (snappy 220ms transition for 60s sprint)
      setTimeout(() => {
        const latestState = useQuizStore.getState();
        if (latestState.sprintTimeLeft > 0) {
          if (latestState.index < latestState.questions.length - 1) {
            next();
          } else {
            // Reached the end of the loaded queue!
            // INSTANTLY provide reserve questions so the UI never pauses or gets stuck:
            const emergencyTournament =
              sprintTournament !== "All Tournaments" &&
              sprintTournament !== "All Events" &&
              sprintTournament !== "All Grand Prix" &&
              !sprintTournament.startsWith("All")
                ? sprintTournament
                : undefined;
            const emergencyBatch = buildGame({
              sport: sprintSport,
              difficulty: sprintDifficulty,
              count: 10,
              category: emergencyTournament,
            });
            appendQuestions(emergencyBatch);
            next();
            // Also trigger background fetch for fresh AI questions
            void fetchMoreQuestions();
          }
        }
      }, 220);
    },
    [locked, finished, choose, sprintTimeLeft, next, incrementSprintAttempts, fetchMoreQuestions, sprintSport, sprintDifficulty, sprintTournament, appendQuestions]
  );

  // Watchdog failsafe: Never let sprint get frozen on a locked question
  useEffect(() => {
    if (!gameStarted || finished || !locked || sprintTimeLeft <= 0) return;
    const failsafe = setTimeout(() => {
      const s = useQuizStore.getState();
      if (s.locked && s.sprintTimeLeft > 0) {
        if (s.index < s.questions.length - 1) {
          next();
        } else {
          const emergencyTournament =
            sprintTournament !== "All Tournaments" &&
            sprintTournament !== "All Events" &&
            sprintTournament !== "All Grand Prix" &&
            !sprintTournament.startsWith("All")
              ? sprintTournament
              : undefined;
          const emergencyBatch = buildGame({
            sport: sprintSport,
            difficulty: sprintDifficulty,
            count: 10,
            category: emergencyTournament,
          });
          appendQuestions(emergencyBatch);
          next();
        }
      }
    }, 450);
    return () => clearTimeout(failsafe);
  }, [locked, gameStarted, finished, sprintTimeLeft, next, appendQuestions, sprintSport, sprintDifficulty, sprintTournament]);

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
            60 seconds on the clock. Generates 25 questions initially with infinite stream replenishment if you answer fast!
          </p>

          {/* Sport Selector */}
          <div className="text-left mb-4">
            <label className="block text-xs font-semibold text-arena-muted uppercase tracking-wider mb-1.5">
              Sport Category
            </label>
            <select
              className="arena-input text-sm cursor-pointer"
              value={sprintSport}
              onChange={(e) => {
                const newSport = e.target.value as Sport | "All Sports";
                setSprintSport(newSport);
                const defaultT = newSport === "All Sports" ? "All Tournaments" : (TOURNAMENTS_BY_SPORT[newSport]?.[0] || "All Tournaments");
                setSprintTournament(defaultT);
                audio.tap();
              }}
            >
              <option value="All Sports" className="bg-arena-panel">All Sports (Multi-Sport Sprint)</option>
              {SPORT_LIST.map((s) => (
                <option key={s} value={s} className="bg-arena-panel">
                  {s === "Football" ? "Football (Soccer)" : s}
                </option>
              ))}
            </select>
          </div>

          {/* Tournament / League Selector */}
          {sprintSport !== "All Sports" && TOURNAMENTS_BY_SPORT[sprintSport] && (
            <div className="text-left mb-4">
              <label className="block text-xs font-semibold text-arena-muted uppercase tracking-wider mb-1.5">
                Tournament / League
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TOURNAMENTS_BY_SPORT[sprintSport].map((t) => {
                  const active = sprintTournament === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSprintTournament(t);
                        audio.tap();
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border cursor-pointer ${
                        active
                          ? "bg-arena-accent/20 border-arena-accent text-arena-accent font-semibold shadow-[0_0_10px_rgba(0,212,255,0.2)]"
                          : "bg-white/[.02] border-arena-line text-arena-muted hover:text-arena-text hover:bg-white/[.05]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  className={`py-2 px-1 text-xs rounded-xl font-bold transition-all border text-center cursor-pointer ${
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

          {/* Decade / Era Filter */}
          <div className="text-left mb-6">
            <label className="block text-xs font-semibold text-arena-muted uppercase tracking-wider mb-1.5">
              Era Filter
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DECADE_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => { setSprintDecade(d.value); audio.click(); }}
                  className={`py-2 px-2.5 text-xs rounded-xl font-bold transition-all border text-center cursor-pointer ${
                    sprintDecade === d.value
                      ? "bg-arena-accent/20 border-arena-accent text-arena-accent shadow-[0_0_15px_rgba(0,212,255,0.25)]"
                      : "bg-white/[.02] border-arena-line text-arena-muted hover:text-arena-text hover:border-white/20"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            className="arena-btn arena-btn-primary text-base sm:text-lg w-full justify-center py-3.5 sm:py-4 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            onClick={startSprint}
            disabled={isGenerating}
            whileHover={{ scale: isGenerating ? 1 : 1.02 }}
            whileTap={{ scale: isGenerating ? 1 : 0.98 }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin text-arena-accent" />
                Synthesizing 25 Blitz Questions via Grok AI...
              </>
            ) : (
              <>
                <Zap size={20} />
                Start {sprintDifficulty} {sprintSport === "All Sports" ? "Sprint" : `${sprintSport} Sprint`}
              </>
            )}
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
            <span className="text-xs text-arena-muted ml-auto">
              Question {index + 1}
            </span>
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
