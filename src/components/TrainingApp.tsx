"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Problem, AppSettings, ProblemStats } from "@/lib/types";
import {
  DEFAULT_SETTINGS,
  addCustomProblems,
  isCustomProblemId,
  loadCustomProblems,
  loadSettings,
  loadStats,
  recordAnswer,
  saveSettings,
} from "@/lib/storage";
import { pickByPriority } from "@/lib/scheduling";
import {
  DailyState,
  currentStreak,
  getOrCreateToday,
  isCompleteToday,
  loadDaily,
} from "@/lib/daily";
import { FilterBar } from "./FilterBar";
import { StatsBar } from "./StatsBar";
import { TrainingCard } from "./TrainingCard";
import { GenerateDialog } from "./GenerateDialog";
import { AddProblemDialog } from "./AddProblemDialog";
import { DailyChallenge } from "./DailyChallenge";

type Props = {
  initialProblems: Problem[];
  // 問題生成機能を使えるか（Gemini 利用可能か）。
  allowGenerate: boolean;
  // 共有プール（ファイル）に保存できるか。false の場合はブラウザ（localStorage）保存。
  allowPool: boolean;
  allowGrade: boolean;
  startInDaily?: boolean;
};

const computeExcludeSize = (poolSize: number): number => {
  if (poolSize <= 2) return 0;
  if (poolSize <= 5) return Math.max(1, poolSize - 2);
  return Math.min(5, Math.floor(poolSize / 2));
};

const pickRandomExcluding = (
  problems: Problem[],
  excludeIds: string[],
): Problem | null => {
  if (problems.length === 0) return null;
  const excludeCount = computeExcludeSize(problems.length);
  const excludeSet = new Set(excludeIds.slice(-excludeCount));
  const pool = problems.filter((p) => !excludeSet.has(p.id));
  const target = pool.length > 0 ? pool : problems;
  return target[Math.floor(Math.random() * target.length)];
};

export const TrainingApp = ({
  initialProblems,
  allowGenerate,
  allowPool,
  allowGrade,
  startInDaily = false,
}: Props) => {
  const [fileProblems, setFileProblems] = useState<Problem[]>(initialProblems);
  const [customProblems, setCustomProblems] = useState<Problem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Record<string, ProblemStats>>({});
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [advanceCount, setAdvanceCount] = useState(0);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [dailyMode, setDailyMode] = useState(false);
  const [dailyAutoStarted, setDailyAutoStarted] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setStats(loadStats());
    setCustomProblems(loadCustomProblems());
    setHydrated(true);
  }, []);

  // ファイル由来の問題とブラウザ保存の自作問題を統合（id 重複は除外）
  const problems = useMemo(() => {
    const ids = new Set(fileProblems.map((p) => p.id));
    return [...fileProblems, ...customProblems.filter((p) => !ids.has(p.id))];
  }, [fileProblems, customProblems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (settings.filterCategory !== "all" && p.category !== settings.filterCategory) {
        return false;
      }
      if (
        settings.filterDifficulty !== "all" &&
        p.difficulty !== settings.filterDifficulty
      ) {
        return false;
      }
      return true;
    });
  }, [problems, settings.filterCategory, settings.filterDifficulty]);

  const pickNext = useCallback((): Problem | null => {
    if (filteredProblems.length === 0) return null;
    const excludeCount = computeExcludeSize(filteredProblems.length);
    const excludeIds = recentIds.slice(-excludeCount);
    if (settings.weakProblemMode) {
      return pickByPriority(filteredProblems, (p) => stats[p.id], { excludeIds });
    }
    return pickRandomExcluding(filteredProblems, excludeIds);
  }, [filteredProblems, settings.weakProblemMode, stats, recentIds]);

  const advanceTo = useCallback(
    (next: Problem | null) => {
      setCurrentProblem(next);
      setAdvanceCount((n) => n + 1);
      if (next) {
        setRecentIds((prev) => [...prev, next.id].slice(-10));
      }
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!currentProblem || !filteredProblems.find((p) => p.id === currentProblem.id)) {
      advanceTo(pickNext());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, filteredProblems, settings.weakProblemMode]);

  // 当日の課題セットを用意する（日付が変わったら自動で再生成。1日1回・冪等）。
  useEffect(() => {
    if (!hydrated || problems.length === 0) return;
    setDaily(getOrCreateToday(problems, stats, settings.dailyCount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, problems.length]);

  // ホームから ?daily=1 で来たときは、課題セットが整い次第すぐ課題モードに入る（初回のみ）。
  useEffect(() => {
    if (!startInDaily || dailyAutoStarted) return;
    if (daily && daily.problemIds.length > 0) {
      setDailyMode(true);
      setDailyAutoStarted(true);
    }
  }, [startInDaily, dailyAutoStarted, daily]);

  const handleSettingsChange = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleProblemUpdated = (problemId: string, english: string) => {
    if (isCustomProblemId(problemId)) {
      setCustomProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, english } : p)),
      );
    } else {
      setFileProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, english } : p)),
      );
    }
    setCurrentProblem((prev) =>
      prev && prev.id === problemId ? { ...prev, english } : prev,
    );
  };

  const handleAnswered = (isCorrect: boolean) => {
    if (!currentProblem) return;
    recordAnswer(currentProblem.id, isCorrect);
    setStats(loadStats());
    setSessionAnswered((n) => n + 1);
    if (isCorrect) setSessionCorrect((n) => n + 1);
  };

  const handleNext = () => {
    advanceTo(pickNext());
  };

  const handleSkip = () => {
    advanceTo(pickNext());
  };

  const reloadProblems = useCallback(async () => {
    const res = await fetch("/api/problems");
    if (!res.ok) return;
    const data = await res.json();
    setFileProblems(data.problems as Problem[]);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleGenerated = async (result: {
    generated: number;
    totalProblems?: number;
    problems?: Problem[];
  }) => {
    if (allowPool) {
      // ローカル: 共有プール（ファイル）に保存済み → 再読み込み
      await reloadProblems();
      showToast(
        `${result.generated} 問を生成しました（合計 ${result.totalProblems} 問）`,
      );
      return;
    }
    // 公開環境: 生成結果をこのブラウザ（localStorage）に保存。id は "local-" 始まりにする。
    const incoming = (result.problems ?? []).map((p, i) => ({
      ...p,
      id: `local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    const before = customProblems.length;
    const merged = addCustomProblems(incoming);
    setCustomProblems(merged);
    showToast(
      `${merged.length - before} 問を生成し、このブラウザに保存しました`,
    );
  };

  const handleAdded = async (result: {
    problem: Problem;
    savedToPool: boolean;
  }) => {
    if (result.savedToPool) {
      await reloadProblems();
      showToast("文章を共有プールに追加しました");
    } else {
      setCustomProblems((prev) => [...prev, result.problem]);
      showToast("文章をこのブラウザに追加しました");
    }
  };

  if (!hydrated) {
    return <div className="text-center text-brand-muted">読み込み中…</div>;
  }

  if (dailyMode && daily) {
    return (
      <DailyChallenge
        daily={daily}
        problems={problems}
        allowGrade={allowGrade}
        allowPoolUpdate={allowPool}
        strictMode={settings.strictMode}
        onAnswered={handleAnswered}
        onDailyUpdate={setDaily}
        onProblemUpdated={handleProblemUpdated}
        onExit={() => {
          setDaily(loadDaily());
          setDailyMode(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg border border-brand-primary bg-white px-4 py-2 text-sm font-medium text-brand-primary shadow-sm hover:bg-blue-50"
        >
          + 文章を追加
        </button>
        {allowGenerate && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-600"
          >
            + 問題を生成
          </button>
        )}
      </div>

      {daily && daily.problemIds.length > 0 && (
        <DailyBanner
          done={daily.completedIds.length}
          total={daily.problemIds.length}
          complete={isCompleteToday(daily)}
          streak={currentStreak(daily)}
          onStart={() => setDailyMode(true)}
        />
      )}

      <FilterBar
        settings={settings}
        onChange={handleSettingsChange}
        availableCount={filteredProblems.length}
      />

      {filteredProblems.length === 0 ? (
        <div className="rounded-xl bg-brand-surface p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-brand-muted">
            条件に合う問題がありません。フィルタを変更するか、「問題を生成」ボタンから新しい問題を作成してください。
          </div>
        </div>
      ) : currentProblem ? (
        <TrainingCard
          key={`${currentProblem.id}-${advanceCount}`}
          problem={currentProblem}
          strictMode={settings.strictMode}
          allowGrade={allowGrade}
          allowPoolUpdate={allowPool}
          onAnswered={handleAnswered}
          onNext={handleNext}
          onSkip={handleSkip}
          onProblemUpdated={handleProblemUpdated}
        />
      ) : (
        <div className="rounded-xl bg-brand-surface p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-brand-muted">問題を読み込み中…</div>
        </div>
      )}

      <StatsBar
        sessionAnswered={sessionAnswered}
        sessionCorrect={sessionCorrect}
        totalProblems={problems.length}
      />

      {allowGenerate && (
        <GenerateDialog
          open={dialogOpen}
          existingJapanese={problems.map((p) => p.japanese)}
          onClose={() => setDialogOpen(false)}
          onGenerated={handleGenerated}
        />
      )}

      <AddProblemDialog
        open={addOpen}
        allowPool={allowPool}
        allowTranslate={allowGrade}
        onClose={() => setAddOpen(false)}
        onAdded={handleAdded}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

type DailyBannerProps = {
  done: number;
  total: number;
  complete: boolean;
  streak: number;
  onStart: () => void;
};

const DailyBanner = ({
  done,
  total,
  complete,
  streak,
  onStart,
}: DailyBannerProps) => {
  const label = complete ? "結果を見る" : done > 0 ? "続ける" : "始める";
  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-50 to-amber-50 p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-text">
            {complete ? "✅ 今日の課題 完了！" : "📅 今日の課題"}
            {streak > 0 && (
              <span className="text-xs font-medium text-amber-700">
                🔥 連続 {streak} 日
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-brand-muted">
            {complete ? `正解 ${done} / ${total}` : `進捗 ${done} / ${total} 問`}
          </div>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full bg-brand-primary transition-all"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="shrink-0 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          {label}
        </button>
      </div>
    </div>
  );
};
