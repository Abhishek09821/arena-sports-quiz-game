import { create } from "zustand";
import type { Question, Sport, Difficulty } from "@/data/questions";

export type GameMode = "solo" | "challenge" | "buzzer" | "sprint";

type State = {
  questions: Question[];
  index: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  wrong: number;
  selected: number | null;
  locked: boolean;
  roundCount: number;
  sport: Sport | "All Sports";
  difficulty: Difficulty | "Mixed";
  mode: GameMode;
  start: (questions: Question[], options: { sport: Sport | "All Sports"; difficulty: Difficulty | "Mixed"; mode: GameMode }) => void;
  choose: (option: number, secondsLeft: number) => boolean;
  next: () => void;
  reset: () => void;
};

export const useQuizStore = create<State>((set, get) => ({
  questions: [], index: 0, score: 0, streak: 0, bestStreak: 0, correct: 0, wrong: 0,
  selected: null, locked: false, roundCount: 0, sport: "All Sports", difficulty: "Mixed", mode: "solo",
  start: (questions, options) => set({ questions, index: 0, score: 0, streak: 0, bestStreak: 0, correct: 0, wrong: 0, selected: null, locked: false, roundCount: questions.length, ...options }),
  choose: (option, secondsLeft) => {
    const s = get();
    if (s.locked || !s.questions[s.index]) return false;
    const q = s.questions[s.index];
    const correct = option === q.answer;
    const base = { Easy: 100, Medium: 150, Hard: 220, Legendary: 350 }[q.difficulty];
    const gained = correct ? base + Math.max(0, Math.round(secondsLeft * 4)) + s.streak * 20 : 0;
    set({ selected: option, locked: true, score: s.score + gained, streak: correct ? s.streak + 1 : 0, bestStreak: correct ? Math.max(s.bestStreak, s.streak + 1) : s.bestStreak, correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) });
    return correct;
  },
  next: () => set((s) => ({ index: s.index + 1, selected: null, locked: false })),
  reset: () => set({ questions: [], index: 0, score: 0, streak: 0, bestStreak: 0, correct: 0, wrong: 0, selected: null, locked: false, roundCount: 0 }),
}));
