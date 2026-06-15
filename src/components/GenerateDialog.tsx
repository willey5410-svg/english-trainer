"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  Category,
  DIFFICULTY_LABELS,
  Difficulty,
} from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerated: (result: { generated: number; totalProblems: number }) => void;
};

const GRAMMAR_PRESETS = [
  "",
  "現在形",
  "過去形",
  "現在進行形",
  "現在完了",
  "過去完了",
  "未来形",
  "受動態",
  "助動詞",
  "比較",
  "関係代名詞",
  "仮定法",
  "不定詞",
  "動名詞",
  "分詞構文",
  "間接疑問文",
];

export const GenerateDialog = ({ open, onClose, onGenerated }: Props) => {
  const [category, setCategory] = useState<Category>("daily");
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [grammar, setGrammar] = useState<string>("");
  const [count, setCount] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          difficulty,
          grammar: grammar || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "生成に失敗しました");
      }
      onGenerated({
        generated: data.generated,
        totalProblems: data.totalProblems,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">問題を生成</h2>
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

          <label className="block">
            <span className="mb-1 block text-sm text-brand-muted">難易度</span>
            <select
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
              disabled={loading}
            >
              {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-brand-muted">
              文型/文法（任意）
            </span>
            <input
              list="grammar-presets"
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              value={grammar}
              onChange={(e) => setGrammar(e.target.value)}
              placeholder="空欄ならランダム"
              disabled={loading}
            />
            <datalist id="grammar-presets">
              {GRAMMAR_PRESETS.filter((g) => g).map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-brand-muted">
              件数（1〜50）
            </span>
            <input
              type="number"
              min={1}
              max={50}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
              }
              disabled={loading}
            />
          </label>

          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
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
              {loading ? "生成中…" : "生成する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
