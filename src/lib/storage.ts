"use client";

import { AppSettings, ProblemStats } from "./types";

const STATS_KEY = "english-trainer:stats";
const SETTINGS_KEY = "english-trainer:settings";

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
