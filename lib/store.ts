/* ═══════════════════════════════════════════════════════════════
   ARENA — Game State Store (Zustand)
   Centralized game state for all modes.
   ═══════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Question, Sport, Difficulty } from "@/data/questions";
import { scoreAnswer } from "@/lib/scoring";

export type GameMode = "classic" | "sprint" | "challenge" | "buzzer" | "idol";

export interface AnswerRecord {
  questionId: string;
  selectedOption: number;
  correctOption: number;
  correct: boolean;
  timeLeft: number;
  pointsEarned: number;
}

interface GameState {
  // ── Game Configuration ─────────────────────────────────
  sessionId: string | null;
  questions: Question[];
  mode: GameMode;
  sport: Sport | "All Sports";
  difficulty: Difficulty | "Mixed";
  roundCount: number;

  // ── Game Progress ──────────────────────────────────────
  index: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  wrong: number;
  selected: number | null;
  locked: boolean;
  answerHistory: AnswerRecord[];
  totalTimeTaken: number;

  // ── Sprint Mode ────────────────────────────────────────
  sprintActive: boolean;
  sprintTimeLeft: number;
  questionsAttempted: number;

  // ── Actions ────────────────────────────────────────────
  start: (
    questions: Question[],
    options: {
      sport: Sport | "All Sports";
      difficulty: Difficulty | "Mixed";
      mode: GameMode;
      sessionId?: string;
    }
  ) => void;
  choose: (option: number, secondsLeft: number) => boolean;
  next: () => void;
  reset: () => void;
  setSprintTime: (t: number) => void;
  incrementSprintAttempts: () => void;
  appendQuestions: (newQuestions: Question[]) => void;
  setSessionId: (id: string) => void;
}

export const useQuizStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
  sessionId: null,
  questions: [],
  mode: "classic",
  sport: "All Sports",
  difficulty: "Mixed",
  roundCount: 0,
  index: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  wrong: 0,
  selected: null,
  locked: false,
  answerHistory: [],
  totalTimeTaken: 0,
  sprintActive: false,
  sprintTimeLeft: 60,
  questionsAttempted: 0,

  start: (questions, options) =>
    set({
      questions,
      sessionId: options.sessionId || null,
      index: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correct: 0,
      wrong: 0,
      selected: null,
      locked: false,
      roundCount: questions.length,
      answerHistory: [],
      totalTimeTaken: 0,
      sprintActive: options.mode === "sprint",
      sprintTimeLeft: 60,
      questionsAttempted: 0,
      ...options,
    }),

  choose: (option, secondsLeft) => {
    const s = get();
    if (s.locked || !s.questions[s.index]) return false;
    const q = s.questions[s.index];
    const isCorrect = option === q.answer;
    const result = scoreAnswer(q.difficulty, secondsLeft, isCorrect, s.streak);

    const record: AnswerRecord = {
      questionId: q.id,
      selectedOption: option,
      correctOption: q.answer,
      correct: isCorrect,
      timeLeft: secondsLeft,
      pointsEarned: result.total,
    };

    set({
      selected: option,
      locked: true,
      score: s.score + result.total,
      streak: isCorrect ? s.streak + 1 : 0,
      bestStreak: isCorrect
        ? Math.max(s.bestStreak, s.streak + 1)
        : s.bestStreak,
      correct: s.correct + (isCorrect ? 1 : 0),
      wrong: s.wrong + (isCorrect ? 0 : 1),
      answerHistory: [...s.answerHistory, record],
      totalTimeTaken: s.totalTimeTaken + (secondsLeft > 0 ? (30 - secondsLeft) : 30),
    });
    return isCorrect;
  },

  next: () =>
    set((s) => ({
      index: s.index + 1,
      selected: null,
      locked: false,
    })),

  reset: () =>
    set({
      sessionId: null,
      questions: [],
      index: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correct: 0,
      wrong: 0,
      selected: null,
      locked: false,
      roundCount: 0,
      answerHistory: [],
      totalTimeTaken: 0,
      sprintActive: false,
      sprintTimeLeft: 60,
      questionsAttempted: 0,
    }),

  setSprintTime: (t) => set({ sprintTimeLeft: t }),

  incrementSprintAttempts: () =>
    set((s) => ({ questionsAttempted: s.questionsAttempted + 1 })),

  appendQuestions: (newQuestions) =>
    set((s) => {
      const existingIds = new Set(s.questions.map((q) => q.id));
      const existingTexts = new Set(
        s.questions.map((q) => q.question.toLowerCase().replace(/[^a-z0-9]/g, ""))
      );
      const filtered = newQuestions.filter((q) => {
        const norm = q.question.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (existingIds.has(q.id) || existingTexts.has(norm)) {
          return false;
        }
        existingIds.add(q.id);
        existingTexts.add(norm);
        return true;
      });
      return {
        questions: [...s.questions, ...filtered],
        roundCount: s.questions.length + filtered.length,
      };
    }),

  setSessionId: (id: string) => set({ sessionId: id }),
    }),
    {
      name: "arena_quiz_session",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? sessionStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        sessionId: state.sessionId,
        questions: state.questions,
        mode: state.mode,
        sport: state.sport,
        difficulty: state.difficulty,
        roundCount: state.roundCount,
        index: state.index,
        score: state.score,
        streak: state.streak,
        bestStreak: state.bestStreak,
        correct: state.correct,
        wrong: state.wrong,
        answerHistory: state.answerHistory,
        totalTimeTaken: state.totalTimeTaken,
      }),
    }
  )
);
