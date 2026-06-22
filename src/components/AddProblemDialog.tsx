"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  Category,
  DIFFICULTY_LABELS,
  Difficulty,
  Problem,
} from "@/lib/types";
import { addCustomProblem } from "@/lib/storage";
import { aiPost } from "@/lib/access";
import { AccessCodeForm } from "./AccessCodeForm";

type Props = {
  open: boolean;
  allowPool: boolean;
  allowTranslate: boolean;
  defaultCategory?: Category;
  onClose: () => void;
  onAdded: (result: { problem: Problem; savedToPool: boolean }) => void;
};

export const AddProblemDialog = ({
  open,
  allowPool,
  allowTranslate,
  defaultCategory = "other",
  onClose,
  onAdded,
}: Props) => {
  const [japanese, setJapanese] = useState("");
  const [english, setEnglish] = useState("");
  const [category, setCategory] = useState<Category>(defaultCategory);
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [grammar, setGrammar] = useState("");
  const [notes, setNotes] = useState("");
  // ローカル開発時は既定で共有プール（ファイル）に保存。公開環境ではブラウザ保存のみ。
  const [saveToPool, setSaveToPool] = useState(allowPool);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setJapanese("");
    setEnglish("");
    setGrammar("");
    setNotes("");
    setError(null);
  };

  const handleTranslate = async () => {
    const jp = japanese.trim();
    if (!jp) {
      setError("先に日本語文を入力してください");
      return;
    }
    setTranslating(true);
    setError(null);
    try {
      const res = await aiPost("/api/translate", { japanese: jp, difficulty });
      if (res.status === 401) {
        // アクセスコード未設定・不一致 → 画面内の入力フォームを表示
        setNeedsCode(true);
        setError("AI機能のアクセスコードが必要です");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "英訳に失敗しました");
      setNeedsCode(false);
      // 英訳は欄に反映（自動入力後も手で修正できる）。notes は空のときだけ補完する。
      setEnglish(data.english ?? "");
      if (data.notes && !notes.trim()) setNotes(data.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "英訳に失敗しました");
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async () => {
    const jp = japanese.trim();
    const en = english.trim();
    if (!jp || !en) {
      setError("日本語文と英訳の両方を入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (allowPool && saveToPool) {
        // 共有プール（data/problems.json）へ保存
        const res = await fetch("/api/problems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            japanese: jp,
            english: en,
            category,
            difficulty,
            grammar: grammar.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "追加に失敗しました");
        onAdded({ problem: data.problem as Problem, savedToPool: true });
      } else {
        // ブラウザ保存（localStorage）。id は "local-" 始まり。
        const problem: Problem = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          japanese: jp,
          english: en,
          category,
          difficulty,
          grammar: grammar.trim() || undefined,
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        addCustomProblem(problem);
        onAdded({ problem, savedToPool: false });
      }
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">文章を追加</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-brand-muted hover:text-brand-text disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-brand-muted">日本語文</span>
            <textarea
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              rows={2}
              value={japanese}
              onChange={(e) => setJapanese(e.target.value)}
              placeholder="例: 駅までの道を教えてもらえますか？"
              disabled={loading}
            />
          </label>

          <label className="block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-brand-muted">英訳</span>
              {allowTranslate && (
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={loading || translating || !japanese.trim()}
                  className="rounded bg-brand-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {translating ? "英訳中…" : "AIで英訳"}
                </button>
              )}
            </div>
            <textarea
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              rows={2}
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="例: Could you tell me the way to the station?（日本語を入れて「AIで英訳」も可）"
              disabled={loading || translating}
            />
          </label>

          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="mb-1 block text-sm text-brand-muted">カテゴリ</span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                disabled={loading}
              >
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block flex-1">
              <span className="mb-1 block text-sm text-brand-muted">難易度</span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(Number(e.target.value) as Difficulty)
                }
                disabled={loading}
              >
                {([1, 2, 3] as Difficulty[]).map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-brand-muted">
              文型/文法（任意）
            </span>
            <input
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              value={grammar}
              onChange={(e) => setGrammar(e.target.value)}
              placeholder="例: 助動詞 / 関係代名詞"
              disabled={loading}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-brand-muted">
              メモ（任意・学習ポイントなど）
            </span>
            <textarea
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </label>

          {allowPool && (
            <label className="flex items-start gap-2 text-sm text-brand-text">
              <input
                type="checkbox"
                className="mt-1"
                checked={saveToPool}
                onChange={(e) => setSaveToPool(e.target.checked)}
                disabled={loading}
              />
              <span>
                共有プールに保存（data/problems.json に追記・コミット対象）
                <span className="mt-0.5 block text-xs text-brand-muted">
                  オフにするとこのブラウザのみに保存します
                </span>
              </span>
            </label>
          )}
          {!allowPool && (
            <div className="rounded bg-slate-50 px-3 py-2 text-xs text-brand-muted">
              この環境ではこのブラウザ（localStorage）に保存されます。
            </div>
          )}

          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {needsCode && (
            <AccessCodeForm
              onSubmit={() => {
                setNeedsCode(false);
                handleTranslate();
              }}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "追加中…" : "追加する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
