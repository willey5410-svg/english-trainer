"use client";

import { useEffect, useState } from "react";
import { Problem } from "@/lib/types";
import {
  DailyState,
  currentStreak,
  recordDailyAnswer,
} from "@/lib/daily";
import { TrainingCard } from "./TrainingCard";

type Props = {
  daily: DailyState;
  problems: Problem[];
  allowGrade: boolean;
  strictMode: boolean;
  onAnswered: (isCorrect: boolean) => void; // 親側で全体統計・セッションに記録
  onDailyUpdate: (state: DailyState) => void;
  onExit: () => void;
};

export const DailyChallenge = ({
  daily,
  problems,
  allowGrade,
  strictMode,
  onAnswered,
  onDailyUpdate,
  onExit,
}: Props) => {
  const total = daily.problemIds.length;
  // 出題は順番固定。リロード時は解いた数の続きから再開する。
  const [cursor, setCursor] = useState(daily.completedIds.length);

  const currentId = daily.problemIds[cursor];
  const problem = currentId
    ? problems.find((p) => p.id === currentId)
    : undefined;

  // セット内の id が（自作問題の削除などで）見つからない場合は自動スキップ。
  useEffect(() => {
    if (cursor < total && currentId && !problem) {
      setCursor((c) => c + 1);
    }
  }, [cursor, total, currentId, problem]);

  const handleAnswered = (isCorrect: boolean) => {
    onAnswered(isCorrect);
    if (currentId) onDailyUpdate(recordDailyAnswer(currentId, isCorrect));
  };

  const handleNext = () => setCursor((c) => c + 1);

  const done = daily.completedIds.length;
  const correct = daily.correctIds.length;
  const streak = currentStreak(daily);
  const finished = cursor >= total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-text">今日の課題</h2>
        <button
          type="button"
          onClick={onExit}
          className="text-sm text-brand-muted hover:text-brand-text hover:underline"
        >
          ← トレーニングに戻る
        </button>
      </div>

      <div className="rounded-xl bg-brand-surface p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-brand-text">
            完了 {done} / {total}
          </span>
          <span className="text-brand-muted">
            {streak > 0 ? `🔥 連続 ${streak} 日` : "🔥 連続 0 日"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-brand-primary transition-all"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl bg-brand-surface p-8 text-center text-brand-muted shadow-sm ring-1 ring-slate-200">
          出題できる問題がありません。問題を追加してください。
        </div>
      ) : finished ? (
        <div className="rounded-xl bg-brand-surface p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-4xl">🎉</div>
          <div className="mt-3 text-lg font-bold text-brand-text">
            今日の課題 完了！
          </div>
          <div className="mt-2 text-sm text-brand-muted">
            正解 {correct} / {total}（
            {total > 0 ? Math.round((correct / total) * 100) : 0}%）
          </div>
          {streak > 0 && (
            <div className="mt-1 text-sm text-amber-700">
              🔥 連続 {streak} 日 達成
            </div>
          )}
          <div className="mt-3 text-xs text-brand-muted">
            結果は学習統計にも反映されています。
          </div>
          <button
            type="button"
            onClick={onExit}
            className="mt-5 rounded-lg bg-brand-primary px-6 py-2.5 text-base font-medium text-white shadow hover:bg-blue-700"
          >
            トレーニングに戻る
          </button>
        </div>
      ) : problem ? (
        <>
          <div className="text-center text-xs text-brand-muted">
            {cursor + 1} / {total} 問目
          </div>
          <TrainingCard
            key={`${problem.id}-${cursor}`}
            problem={problem}
            strictMode={strictMode}
            allowGrade={allowGrade}
            hideSkip
            onAnswered={handleAnswered}
            onNext={handleNext}
            onSkip={handleNext}
          />
        </>
      ) : (
        <div className="rounded-xl bg-brand-surface p-8 text-center text-brand-muted shadow-sm ring-1 ring-slate-200">
          問題を読み込み中…
        </div>
      )}
    </div>
  );
};
