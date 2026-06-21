"use client";

import { useEffect, useMemo, useState } from "react";
import { Problem, ProblemStats } from "@/lib/types";
import { clearStats, loadCustomProblems, loadStats } from "@/lib/storage";
import {
  computeAggregate,
  computeByCategory,
  computeByDifficulty,
  computeRecentlyAnswered,
  computeWeakProblems,
  formatPercent,
  GroupedStats,
} from "@/lib/statistics";
import { computePriority, formatReviewTiming } from "@/lib/scheduling";

type Props = {
  problems: Problem[];
};

const AccuracyBar = ({ value }: { value: number }) => {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.8
      ? "bg-emerald-500"
      : value >= 0.5
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const GroupRow = <K extends string | number>({ row }: { row: GroupedStats<K> }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-brand-text">{row.label}</span>
        <span className="text-brand-muted">
          {row.total > 0 ? (
            <>
              {formatPercent(row.accuracy)}{" "}
              <span className="text-xs">({row.correct}/{row.total})</span>
            </>
          ) : (
            <span className="text-xs">未回答</span>
          )}
        </span>
      </div>
      <AccuracyBar value={row.accuracy} />
      <div className="text-xs text-brand-muted">
        問題数 {row.problemCount} / 回答済 {row.answeredCount}
      </div>
    </div>
  );
};

export const StatsView = ({ problems: fileProblems }: Props) => {
  const [stats, setStats] = useState<Record<string, ProblemStats>>({});
  const [customProblems, setCustomProblems] = useState<Problem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStats(loadStats());
    setCustomProblems(loadCustomProblems());
    setHydrated(true);
  }, []);

  // ファイル由来の問題とブラウザ保存の自作問題を統合（id 重複は除外）
  const problems = useMemo(() => {
    const ids = new Set(fileProblems.map((p) => p.id));
    return [...fileProblems, ...customProblems.filter((p) => !ids.has(p.id))];
  }, [fileProblems, customProblems]);

  if (!hydrated) {
    return <div className="text-center text-brand-muted">読み込み中…</div>;
  }

  const now = Date.now();
  const aggregate = computeAggregate(problems, stats);
  const byCategory = computeByCategory(problems, stats).filter(
    (g) => g.problemCount > 0,
  );
  const byDifficulty = computeByDifficulty(problems, stats).filter(
    (g) => g.problemCount > 0,
  );
  const weak = computeWeakProblems(problems, stats, 10);
  const recent = computeRecentlyAnswered(problems, stats, 10);

  const dueForReview = problems
    .map((p) => ({ problem: p, priority: computePriority(p, stats[p.id], now) }))
    .filter(
      ({ priority }) =>
        !priority.isUntried && priority.nextReviewAt && priority.nextReviewAt.getTime() <= now,
    )
    .sort((a, b) => b.priority.score - a.priority.score)
    .slice(0, 10);

  const handleClear = () => {
    if (!window.confirm("学習進捗をすべて削除しますか？問題プール自体は残ります。")) {
      return;
    }
    clearStats();
    setStats({});
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-brand-surface p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-text">全体サマリ</h2>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-red-600 hover:underline"
          >
            進捗をリセット
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard
            label="正答率"
            value={aggregate.totalAnswers > 0 ? formatPercent(aggregate.accuracy) : "—"}
            sub={`${aggregate.totalCorrect} / ${aggregate.totalAnswers}`}
          />
          <SummaryCard
            label="回答数"
            value={`${aggregate.totalAnswers}`}
            sub="累計"
          />
          <SummaryCard
            label="回答済み問題"
            value={`${aggregate.answeredProblems}`}
            sub={`/ ${aggregate.totalProblems} 問`}
          />
          <SummaryCard
            label="残り未着手"
            value={`${aggregate.totalProblems - aggregate.answeredProblems}`}
            sub="問題"
          />
        </div>
      </section>

      <section className="rounded-xl bg-brand-surface p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-base font-bold text-brand-text">カテゴリ別</h2>
        {byCategory.length === 0 ? (
          <div className="text-sm text-brand-muted">問題がありません。</div>
        ) : (
          <div className="space-y-4">
            {byCategory.map((row) => (
              <GroupRow key={row.key} row={row} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-brand-surface p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-base font-bold text-brand-text">難易度別</h2>
        {byDifficulty.length === 0 ? (
          <div className="text-sm text-brand-muted">問題がありません。</div>
        ) : (
          <div className="space-y-4">
            {byDifficulty.map((row) => (
              <GroupRow key={row.key} row={row} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-brand-surface p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-base font-bold text-brand-text">苦手問題 トップ10</h2>
        {weak.length === 0 ? (
          <div className="text-sm text-brand-muted">
            まだ苦手と判定された問題はありません。
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {weak.map((w, idx) => (
              <li key={w.problem.id} className="py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-bold text-red-600">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-brand-text">
                      {w.problem.japanese}
                    </div>
                    <div className="truncate text-xs text-brand-muted">
                      {w.problem.english}
                    </div>
                    <div className="mt-1 text-xs text-red-700">
                      不正解 {w.stats.incorrectCount} / 回答 {w.total}（
                      {formatPercent(w.incorrectRate)} 不正解率）
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-brand-surface p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-text">復習推奨</h2>
          <span className="text-xs text-brand-muted">期待間隔を超えた問題</span>
        </div>
        {dueForReview.length === 0 ? (
          <div className="text-sm text-brand-muted">
            現在、復習推奨の問題はありません。
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {dueForReview.map(({ problem, priority }) => (
              <li key={problem.id} className="py-3">
                <div className="text-sm font-medium text-brand-text">
                  {problem.japanese}
                </div>
                <div className="truncate text-xs text-brand-muted">
                  {problem.english}
                </div>
                <div className="mt-1 text-xs text-amber-700">
                  {formatReviewTiming(priority, now)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-brand-surface p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-base font-bold text-brand-text">最近の回答</h2>
        {recent.length === 0 ? (
          <div className="text-sm text-brand-muted">まだ履歴がありません。</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map(({ problem, stats: s }) => {
              const priority = computePriority(problem, s, now);
              return (
                <li key={problem.id} className="py-3">
                  <div className="text-sm font-medium text-brand-text">
                    {problem.japanese}
                  </div>
                  <div className="text-xs text-brand-muted">{problem.english}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                    <span>
                      ✓ {s.correctCount} / ✗ {s.incorrectCount}
                    </span>
                    <span>{new Date(s.lastAnsweredAt).toLocaleString("ja-JP")}</span>
                    <span className="text-blue-700">
                      次回: {formatReviewTiming(priority, now)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
  <div className="rounded-lg bg-slate-50 px-3 py-3">
    <div className="text-xs text-brand-muted">{label}</div>
    <div className="mt-1 text-xl font-bold text-brand-text">{value}</div>
    {sub && <div className="text-xs text-brand-muted">{sub}</div>}
  </div>
);
