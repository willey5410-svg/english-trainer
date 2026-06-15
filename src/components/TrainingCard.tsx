"use client";

import { useEffect, useRef, useState } from "react";
import { computeDiff, isExactMatch } from "@/lib/diff";
import { CATEGORY_LABELS, DIFFICULTY_LABELS, Problem } from "@/lib/types";
import { DiffView } from "./DiffView";

type Props = {
  problem: Problem;
  strictMode: boolean;
  onAnswered: (isCorrect: boolean) => void;
  onNext: () => void;
  onSkip: () => void;
};

export const TrainingCard = ({
  problem,
  strictMode,
  onAnswered,
  onNext,
  onSkip,
}: Props) => {
  const [userInput, setUserInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setUserInput("");
    setRevealed(false);
    setGraded(false);
    textareaRef.current?.focus();
  }, [problem.id]);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleGrade = (isCorrect: boolean) => {
    if (graded) return;
    setGraded(true);
    onAnswered(isCorrect);
  };

  const diffSegments = revealed
    ? computeDiff(userInput, problem.english, strictMode)
    : [];
  const autoMatch = revealed && isExactMatch(userInput, problem.english, strictMode);

  return (
    <div className="rounded-xl bg-brand-surface p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
          {CATEGORY_LABELS[problem.category]}
        </span>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
          {DIFFICULTY_LABELS[problem.difficulty]}
        </span>
        {problem.grammar && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            {problem.grammar}
          </span>
        )}
      </div>

      <div className="mb-6 text-2xl font-medium leading-relaxed text-brand-text">
        {problem.japanese}
      </div>

      <textarea
        ref={textareaRef}
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-base focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        rows={3}
        placeholder="英訳を入力（タイピングしなくても、ボタンで解答だけ表示できます）"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !revealed) {
            e.preventDefault();
            handleReveal();
          }
        }}
        disabled={revealed}
      />
      <div className="mt-1 text-xs text-brand-muted">
        ヒント: Cmd/Ctrl + Enter で解答表示
      </div>

      {!revealed ? (
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleReveal}
            className="rounded-lg bg-brand-primary px-6 py-2.5 text-base font-medium text-white shadow hover:bg-blue-700 active:bg-blue-800"
          >
            解答を見る
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-brand-muted hover:text-brand-text hover:underline"
          >
            スキップ →
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {autoMatch && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              完全一致しました
            </div>
          )}
          <DiffView segments={diffSegments} />
          {problem.notes && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="mr-1">📝</span>
              {problem.notes}
            </div>
          )}
          {!graded ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleGrade(false)}
                  className="rounded-lg border border-red-300 bg-white px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  ✗ できなかった
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade(true)}
                  className="rounded-lg border border-emerald-300 bg-white px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  ✓ できた
                </button>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="text-xs text-brand-muted hover:text-brand-text hover:underline"
              >
                スキップ（採点せず次へ）→
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onNext}
                className="rounded-lg bg-brand-primary px-6 py-2.5 text-base font-medium text-white shadow hover:bg-blue-700"
              >
                次の問題へ →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
