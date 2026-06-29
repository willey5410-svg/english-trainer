"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppSettings, Problem, ProblemStats } from "@/lib/types";
import { loadCustomProblems, loadSettings, loadStats } from "@/lib/storage";
import { computeAggregate, formatPercent } from "@/lib/statistics";
import { computePriority } from "@/lib/scheduling";
import {
  DailyState,
  currentStreak,
  getOrCreateToday,
  isCompleteToday,
} from "@/lib/daily";

type Props = {
  initialProblems: Problem[];
};

export const HomeView = ({ initialProblems }: Props) => {
  const [stats, setStats] = useState<Record<string, ProblemStats>>({});
  const [customProblems, setCustomProblems] = useState<Problem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStats(loadStats());
    setCustomProblems(loadCustomProblems());
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // ファイル由来の問題とブラウザ保存の自作問題を統合（id 重複は除外）
  const problems = useMemo(() => {
    const ids = new Set(initialProblems.map((p) => p.id));
    return [...initialProblems, ...customProblems.filter((p) => !ids.has(p.id))];
  }, [initialProblems, customProblems]);

  useEffect(() => {
    if (!hydrated || problems.length === 0 || !settings) return;
    setDaily(getOrCreateToday(problems, stats, settings.dailyCount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, problems.length, settings]);

  if (!hydrated) {
    return <div className="text-center text-brand-muted">読み込み中…</div>;
  }

  const aggregate = computeAggregate(problems, stats);
  const now = Date.now();
  const dueCount = problems.filter((p) => {
    const pr = computePriority(p, stats[p.id], now);
    return (
      !pr.isUntried && pr.nextReviewAt && pr.nextReviewAt.getTime() <= now
    );
  }).length;

  const hasHistory = aggregate.totalAnswers > 0;
  const hasDaily = !!daily && daily.problemIds.length > 0;
  const done = daily?.completedIds.length ?? 0;
  const total = daily?.problemIds.length ?? 0;
  const complete = daily ? isCompleteToday(daily) : false;
  const streak = daily ? currentStreak(daily) : 0;
  const dailyLabel = complete ? "結果を見る" : done > 0 ? "続ける" : "始める";

  return (
    <div className="space-y-6">
      {/* 今日の課題 */}
      {hasDaily ? (
        <section className="rounded-xl bg-gradient-to-r from-blue-50 to-amber-50 p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-base font-bold text-brand-text">
                {complete ? "✅ 今日の課題 完了！" : "📅 今日の課題"}
                {streak > 0 && (
                  <span className="text-xs font-medium text-amber-700">
                    🔥 連続 {streak} 日
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-brand-muted">
                {complete
                  ? `正解 ${done} / ${total}`
                  : `進捗 ${done} / ${total} 問`}
              </div>
              <div className="mt-2 h-2 w-48 max-w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full bg-brand-primary transition-all"
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <Link
              href="/train?daily=1"
              className="shrink-0 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              {dailyLabel}
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-xl bg-brand-surface p-6 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-lg font-bold text-brand-text">ようこそ！👋</div>
          <p className="mt-2 text-sm text-brand-muted">
            日本語文を瞬時に英訳するトレーニングを始めましょう。
          </p>
          <Link
            href="/train"
            className="mt-4 inline-block rounded-lg bg-brand-primary px-6 py-2.5 text-base font-medium text-white shadow hover:bg-blue-700"
          >
            ▶ まず始める
          </Link>
        </section>
      )}

      {/* 学習サマリ */}
      {hasHistory && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-brand-text">学習サマリ</h2>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              label="正答率"
              value={formatPercent(aggregate.accuracy)}
              sub={`${aggregate.totalCorrect} / ${aggregate.totalAnswers}`}
            />
            <SummaryCard
              label="回答済み"
              value={`${aggregate.answeredProblems}`}
              sub={`/ ${aggregate.totalProblems} 問`}
            />
            <SummaryCard
              label="復習推奨"
              value={`${dueCount}`}
              sub="件"
            />
          </div>
        </section>
      )}

      {/* メニュー */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-brand-text">メニュー</h2>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-brand-surface shadow-sm ring-1 ring-slate-200">
          <MenuRow href="/train" icon="✏️" label="トレーニング" desc="問題を解く" />
          <MenuRow
            href="/problems"
            icon="📚"
            label="問題プール"
            desc="問題の追加・一覧・削除"
          />
          <MenuRow
            href="/stats"
            icon="📊"
            label="学習統計"
            desc="正答率・苦手・復習推奨"
          />
        </div>
      </section>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="rounded-lg bg-brand-surface px-3 py-3 text-center shadow-sm ring-1 ring-slate-200">
    <div className="text-xs text-brand-muted">{label}</div>
    <div className="mt-1 text-xl font-bold text-brand-text">{value}</div>
    {sub && <div className="text-xs text-brand-muted">{sub}</div>}
  </div>
);

const MenuRow = ({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
}) => (
  <Link
    href={href}
    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
  >
    <span className="text-xl">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-brand-text">{label}</span>
      <span className="block text-xs text-brand-muted">{desc}</span>
    </span>
    <span className="text-brand-muted">›</span>
  </Link>
);
