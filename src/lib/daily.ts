"use client";

// 「今日の課題（毎日15問）」のロジック。
// 当日の出題セットをローカル日付ごとに固定し、進捗・連続達成日数（ストリーク）を
// localStorage に保存する。出題セットは既存の SRS 重み付き抽選で苦手・復習優先に選ぶ。

import { Problem, ProblemStats } from "./types";
import { pickByPriority } from "./scheduling";

const DAILY_KEY = "english-trainer:daily";

export const DAILY_COUNT = 15;

export type DailyState = {
  date: string; // 当日（ローカル日付 YYYY-MM-DD）
  problemIds: string[]; // その日の固定出題セット
  completedIds: string[]; // 解き終えた問題（出題順）
  correctIds: string[]; // 正解した問題
  streak: number; // 連続達成日数
  lastCompletedDate: string | null; // 最後に「15問完了」した日付
};

// ローカルタイムでの YYYY-MM-DD（UTC ずれで日付が変わらないようにする）。
export const getTodayKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// YYYY-MM-DD 同士の日数差（b - a）。どちらも UTC 0時として解釈するため差は整数。
const daysBetween = (a: string, b: string): number => {
  const diff = Date.parse(b) - Date.parse(a);
  return Math.round(diff / (24 * 60 * 60 * 1000));
};

export const loadDaily = (): DailyState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailyState;
  } catch {
    return null;
  }
};

const saveDaily = (state: DailyState): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DAILY_KEY, JSON.stringify(state));
};

// SRS 重み付き抽選で、重複なく count 問の id を選ぶ。
export const buildDailyProblemIds = (
  problems: Problem[],
  stats: Record<string, ProblemStats>,
  count: number = DAILY_COUNT,
): string[] => {
  const chosen: string[] = [];
  const getStats = (p: Problem) => stats[p.id];
  const target = Math.min(count, problems.length);
  while (chosen.length < target) {
    const pick = pickByPriority(problems, getStats, { excludeIds: chosen });
    if (!pick) break;
    chosen.push(pick.id);
  }
  return chosen;
};

// 当日の DailyState を取得。未作成・日付が変わった場合は新しいセットを生成する。
// ストリークと最終完了日は引き継ぐ。
export const getOrCreateToday = (
  problems: Problem[],
  stats: Record<string, ProblemStats>,
): DailyState => {
  const today = getTodayKey();
  const existing = loadDaily();
  if (existing && existing.date === today && existing.problemIds.length > 0) {
    return existing;
  }
  const state: DailyState = {
    date: today,
    problemIds: buildDailyProblemIds(problems, stats),
    completedIds: [],
    correctIds: [],
    streak: existing?.streak ?? 0,
    lastCompletedDate: existing?.lastCompletedDate ?? null,
  };
  saveDaily(state);
  return state;
};

// 1問の自己採点結果を当日の進捗に記録する。
// 当日のセットを解き切ったタイミングでストリークを更新する。
export const recordDailyAnswer = (
  problemId: string,
  isCorrect: boolean,
): DailyState => {
  const state = loadDaily();
  if (!state || !state.problemIds.includes(problemId)) {
    return state ?? getOrCreateTodayFallback();
  }
  if (!state.completedIds.includes(problemId)) {
    state.completedIds.push(problemId);
    if (isCorrect) state.correctIds.push(problemId);
  }

  const completedAll = state.completedIds.length >= state.problemIds.length;
  // まだ今日分のストリークを加算していなければ更新する。
  if (completedAll && state.lastCompletedDate !== state.date) {
    if (state.lastCompletedDate && daysBetween(state.lastCompletedDate, state.date) === 1) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    state.lastCompletedDate = state.date;
  }

  saveDaily(state);
  return state;
};

// problemIds が空のときの保険（通常は呼ばれない）。
const getOrCreateTodayFallback = (): DailyState => ({
  date: getTodayKey(),
  problemIds: [],
  completedIds: [],
  correctIds: [],
  streak: 0,
  lastCompletedDate: null,
});

// 当日分を解き切ったか。
export const isCompleteToday = (state: DailyState): boolean =>
  state.problemIds.length > 0 &&
  state.completedIds.length >= state.problemIds.length;

// 表示用の現在ストリーク。最終完了日が今日/昨日なら有効、それ以前なら途切れて 0。
export const currentStreak = (state: DailyState): number => {
  if (!state.lastCompletedDate) return 0;
  const d = daysBetween(state.lastCompletedDate, getTodayKey());
  return d === 0 || d === 1 ? state.streak : 0;
};
