"use client";

// ダークモードの状態管理。テーマを localStorage に保存し、<html> の "dark" クラスで切り替える。
// 初回ロード時のちらつき防止用スクリプトは layout.tsx に inline で埋め込んでいる。

export type Theme = "light" | "dark";

export const THEME_KEY = "english-trainer:theme";

export const getStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" ? v : null;
};

export const getSystemTheme = (): Theme =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

// 保存済みの設定があればそれを、なければOSの設定を初期テーマにする。
export const getInitialTheme = (): Theme => getStoredTheme() ?? getSystemTheme();

export const applyTheme = (theme: Theme): void => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
};

export const setTheme = (theme: Theme): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
};
