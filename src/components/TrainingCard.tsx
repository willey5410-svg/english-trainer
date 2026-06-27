"use client";

import { useEffect, useRef, useState } from "react";
import { computeDiff, isExactMatch } from "@/lib/diff";
import { CATEGORY_LABELS, DIFFICULTY_LABELS, Problem } from "@/lib/types";
import { aiPost } from "@/lib/access";
import { isCustomProblemId, updateCustomProblemEnglish } from "@/lib/storage";
import { DiffView } from "./DiffView";
import { AccessCodeForm } from "./AccessCodeForm";

type GradeVerdict = "correct" | "close" | "incorrect";

type GradeResult = {
  score: number;
  verdict: GradeVerdict;
  feedback: string;
  betterVersion?: string;
};

const VERDICT_META: Record<
  GradeVerdict,
  { label: string; box: string; bar: string }
> = {
  correct: {
    label: "正解",
    box: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    bar: "bg-emerald-500",
  },
  close: {
    label: "惜しい",
    box: "bg-amber-50 text-amber-800 ring-amber-200",
    bar: "bg-amber-500",
  },
  incorrect: {
    label: "不正解",
    box: "bg-red-50 text-red-800 ring-red-200",
    bar: "bg-red-500",
  },
};

type Props = {
  problem: Problem;
  strictMode: boolean;
  allowGrade: boolean;
  allowPoolUpdate: boolean;
  onAnswered: (isCorrect: boolean) => void;
  onNext: () => void;
  onSkip: () => void;
  hideSkip?: boolean;
  onProblemUpdated: (problemId: string, english: string) => void;
};

export const TrainingCard = ({
  problem,
  strictMode,
  allowGrade,
  allowPoolUpdate,
  onAnswered,
  onNext,
  onSkip,
  hideSkip = false,
  onProblemUpdated,
}: Props) => {
  const [userInput, setUserInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [replaceState, setReplaceState] = useState<
    "idle" | "saving" | "done" | "declined"
  >("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setUserInput("");
    setRevealed(false);
    setGraded(false);
    setGrading(false);
    setGradeResult(null);
    setGradeError(null);
    setNeedsCode(false);
    setReplaceState("idle");
    textareaRef.current?.focus();
  }, [problem.id]);

  const handleAIGrade = async () => {
    if (grading) return;
    setGrading(true);
    setGradeError(null);
    try {
      const res = await aiPost("/api/grade", {
        japanese: problem.japanese,
        reference: problem.english,
        userAnswer: userInput,
      });
      if (res.status === 401) {
        // アクセスコード未設定・不一致 → 画面内の入力フォームを表示
        setNeedsCode(true);
        setGradeError("AI機能のアクセスコードが必要です");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "採点に失敗しました");
      }
      setNeedsCode(false);
      setGradeResult(data as GradeResult);
      setRevealed(true);
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "採点に失敗しました");
    } finally {
      setGrading(false);
    }
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleReplace = async () => {
    if (!gradeResult?.betterVersion) return;
    const english = gradeResult.betterVersion;
    setReplaceState("saving");
    try {
      if (isCustomProblemId(problem.id)) {
        updateCustomProblemEnglish(problem.id, english);
      } else {
        const res = await fetch("/api/problems", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: problem.id, english }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "更新に失敗しました");
        }
      }
      onProblemUpdated(problem.id, english);
      setReplaceState("done");
    } catch {
      setReplaceState("idle");
    }
  };

  const handleGrade = (isCorrect: boolean) => {
    if (graded) return;
    setGraded(true);
    onAnswered(isCorrect);
  };

  const canReplace = isCustomProblemId(problem.id) || allowPoolUpdate;

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

      {gradeError && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {gradeError}
        </div>
      )}

      {needsCode && (
        <div className="mt-3">
          <AccessCodeForm
            onSubmit={() => {
              setNeedsCode(false);
              handleAIGrade();
            }}
          />
        </div>
      )}

      {!revealed ? (
        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-3">
            {allowGrade && (
              <button
                type="button"
                onClick={handleAIGrade}
                disabled={grading || !userInput.trim()}
                className="rounded-lg bg-brand-accent px-6 py-2.5 text-base font-medium text-white shadow hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {grading ? "採点中…" : "AIで採点"}
              </button>
            )}
            <button
              type="button"
              onClick={handleReveal}
              className="rounded-lg bg-brand-primary px-6 py-2.5 text-base font-medium text-white shadow hover:bg-blue-700 active:bg-blue-800"
            >
              解答を見る
            </button>
          </div>
          {!hideSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-brand-muted hover:text-brand-text hover:underline"
            >
              スキップ →
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {gradeResult && (
            <div
              className={`rounded-lg p-4 ring-1 ${VERDICT_META[gradeResult.verdict].box}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold">
                  AI採点: {VERDICT_META[gradeResult.verdict].label}
                </span>
                <span className="text-2xl font-bold tabular-nums">
                  {gradeResult.score}
                  <span className="ml-0.5 text-sm font-normal">/100</span>
                </span>
              </div>
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/60">
                <div
                  className={`h-full ${VERDICT_META[gradeResult.verdict].bar}`}
                  style={{ width: `${gradeResult.score}%` }}
                />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {gradeResult.feedback}
              </p>
              {gradeResult.betterVersion && (
                <div className="mt-3 rounded-md bg-white/70 px-3 py-2 text-sm">
                  <span className="mr-1 font-medium">改善例:</span>
                  {gradeResult.betterVersion}
                </div>
              )}
              {canReplace &&
                gradeResult.betterVersion &&
                gradeResult.betterVersion !== problem.english &&
                replaceState !== "done" &&
                replaceState !== "declined" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-white/70 px-3 py-2 text-sm">
                    <span>この改善例を模範解答として登録し直しますか？</span>
                    <button
                      type="button"
                      onClick={handleReplace}
                      disabled={replaceState === "saving"}
                      className="rounded border border-brand-primary px-2 py-1 text-xs font-medium text-brand-primary hover:bg-blue-50 disabled:opacity-50"
                    >
                      {replaceState === "saving" ? "更新中…" : "置き換える"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplaceState("declined")}
                      disabled={replaceState === "saving"}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-brand-muted hover:bg-slate-50"
                    >
                      そのままにする
                    </button>
                  </div>
                )}
              {replaceState === "done" && (
                <div className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-emerald-700">
                  模範解答を更新しました
                </div>
              )}
            </div>
          )}
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
              {!hideSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-xs text-brand-muted hover:text-brand-text hover:underline"
                >
                  スキップ（採点せず次へ）→
                </button>
              )}
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
