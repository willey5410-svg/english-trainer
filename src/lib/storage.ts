"use client";

import { AppSettings, Problem, ProblemStats } from "./types";

const STATS_KEY = "english-trainer:stats";
const SETTINGS_KEY = "english-trainer:settings";
const CUSTOM_PROBLEMS_KEY = "english-trainer:custom-problems";

export const DEFAULT_SETTINGS: AppSettings = {
  filterCategory: "all",
  filterDifficulty: "all",
  weakProblemMode: false,
  strictMode: false,
};

export const loadStats = (): Record<string, ProblemStats> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ProblemStats>;
  } catch {
    return {};
  }
};

export const saveStats = (stats: Record<string, ProblemStats>): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const recordAnswer = (problemId: string, isCorrect: boolean): void => {
  const stats = loadStats();
  const existing = stats[problemId] ?? {
    problemId,
    correctCount: 0,
    incorrectCount: 0,
    lastAnsweredAt: "",
  };
  if (isCorrect) {
    existing.correctCount += 1;
  } else {
    existing.incorrectCount += 1;
  }
  existing.lastAnsweredAt = new Date().toISOString();
  stats[problemId] = existing;
  saveStats(stats);
};

export const loadSettings = (): AppSettings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const clearStats = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STATS_KEY);
};

// 自作問題（ブラウザ保存）。公開環境でもファイル書き込みなしで追加できるように
// localStorage に保存する。id は "local-" 始まりにして保存先を判別できるようにする。
export const loadCustomProblems = (): Problem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PROBLEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Problem[]) : [];
  } catch {
    return [];
  }
};

const saveCustomProblems = (problems: Problem[]): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_PROBLEMS_KEY, JSON.stringify(problems));
};

export const addCustomProblem = (problem: Problem): Problem[] => {
  const merged = [...loadCustomProblems(), problem];
  saveCustomProblems(merged);
  return merged;
};

// 生成などで複数問題をまとめて追加する。日本語文が既存と重複するものは除外する。
export const addCustomProblems = (incoming: Problem[]): Problem[] => {
  const existing = loadCustomProblems();
  const existingJapanese = new Set(existing.map((p) => p.japanese.trim()));
  const deduped = incoming.filter(
    (p) => !existingJapanese.has(p.japanese.trim()),
  );
  const merged = [...existing, ...deduped];
  saveCustomProblems(merged);
  return merged;
};

export const deleteCustomProblem = (id: string): Problem[] => {
  const remaining = loadCustomProblems().filter((p) => p.id !== id);
  saveCustomProblems(remaining);
  return remaining;
};

export const isCustomProblemId = (id: string): boolean => id.startsWith("local-");
