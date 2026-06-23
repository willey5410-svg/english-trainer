"use client";

import { useEffect, useState } from "react";
import { Theme, getInitialTheme, setTheme } from "@/lib/theme";

// ライト/ダークを切り替えるボタン。初期テーマは layout.tsx の inline スクリプトで
// 既に <html> に反映済みなので、ここでは現在値を読み取って表示・トグルするだけ。
export const ThemeToggle = () => {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getInitialTheme());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="テーマを切り替える"
      title={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-brand-text shadow-sm hover:bg-slate-50"
    >
      {/* マウント前はSSRと一致させるため中立アイコン */}
      {mounted ? (theme === "dark" ? "☀️" : "🌙") : "🌓"}
    </button>
  );
};
