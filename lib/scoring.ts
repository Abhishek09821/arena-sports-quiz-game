/* ═══════════════════════════════════════════════════════════════
   ARENA — Scoring Engine
   Deterministic, testable scoring based on:
   correctness, difficulty, answer speed, streak.
   ═══════════════════════════════════════════════════════════════ */

import type { Difficulty } from "@/data/questions";

/** Base points for each difficulty level */
const BASE_POINTS: Record<Difficulty, number> = {
  Easy: 100,
  Medium: 150,
  Hard: 220,
  Legendary: 350,
};

/** Maximum time per difficulty (for speed bonus calculation) */
export const TIME_LIMITS: Record<Difficulty, number> = {
  Easy: 30,
  Medium: 25,
  Hard: 20,
  Legendary: 20,
};

/** Streak bonus per consecutive correct answer */
const STREAK_BONUS_PER = 20;

/** Maximum streak bonus cap */
const STREAK_BONUS_CAP = 200;

export interface ScoreResult {
  /** Total points earned for this answer */
  total: number;
  /** Base points from difficulty */
  base: number;
  /** Speed bonus from answering quickly */
  speedBonus: number;
  /** Streak bonus from consecutive correct answers */
  streakBonus: number;
}

/**
 * Calculate score for a single answer.
 * Pure function — no side effects, fully deterministic.
 */
export function scoreAnswer(
  difficulty: Difficulty,
  secondsLeft: number,
  correct: boolean,
  currentStreak: number
): ScoreResult {
  if (!correct) {
    return { total: 0, base: 0, speedBonus: 0, streakBonus: 0 };
  }

  const base = BASE_POINTS[difficulty];
  const speedBonus = Math.max(0, Math.round(secondsLeft * 4));
  const streakBonus = Math.min(currentStreak * STREAK_BONUS_PER, STREAK_BONUS_CAP);
  const total = base + speedBonus + streakBonus;

  return { total, base, speedBonus, streakBonus };
}

/**
 * Get time limit in seconds for a difficulty level.
 */
export function getTimeLimit(difficulty: Difficulty): number {
  return TIME_LIMITS[difficulty];
}
