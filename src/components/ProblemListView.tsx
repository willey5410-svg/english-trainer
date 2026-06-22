"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  Category,
  DIFFICULTY_LABELS,
  Difficulty,
  Problem,
  ProblemStats,
} from "@/lib/types";
import {
  deleteCustomProblem,
  isCustomProblemId,
  loadCustomProblems,
  loadStats,
} from "@/lib/storage";
import { formatPercent } from "@/lib/statistics";
import { AddProblemDialog } from "./AddProblemDialog";

type Props = {
  initialProblems: Problem[];
  allowPool: boolean;
  allowAI: boolean;
};

type SortKey = "newest" | "oldest" | "category" | "difficulty" | "accuracy";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "新しい順",
  oldest: "古い順",
  category: "カテゴリ順",
  difficulty: "難易度順",
  accuracy: "正答率（低い順）",
};

export const ProblemListView = ({
  initialProblems,
  allowPool,
  allowAI,
}: Props) => {
  const [problems, setProblems] = useState<Problem[]>(initialProblems);
  const [stats, setStats] = useState<Record<string, ProblemStats>>({});
  const [category, setCategory] = useState<Category | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStats(loadStats());
    // ブラウザ保存の自作問題を統合（id 重複は除外）
    setProblems((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...loadCustomProblems().filter((p) => !ids.has(p.id))];
    });
  }, []);

  // ブラウザ保存（localStorage）の自作問題を JSON ファイルとして書き出す。
  // 公開版で追加した文章を PC 版に取り込むための受け渡し用。
  const handleExport = () => {
    const customProblems = loadCustomProblems();
    if (customProblems.length === 0) {
      window.alert("このブラウザに保存された自作文章はありません。");
      return;
    }
    const blob = new Blob([JSON.stringify(customProblems, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-problems-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // エクスポートした JSON を共有プール（data/problems.json）へ取り込む。
  // ローカル開発時（allowPool）のみ使用可能。
  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items: Problem[] = Array.isArray(parsed) ? parsed : [];
      if (items.length === 0) {
        window.alert("有効な問題データが見つかりませんでした。");
        return;
      }

      let added = 0;
      let skipped = 0;
      let failed = 0;
      const addedProblems: Problem[] = [];

      for (const item of items) {
        if (!item.japanese || !item.english) {
          failed += 1;
          continue;
        }
        try {
          const res = await fetch("/api/problems", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              japanese: item.japanese,
              english: item.english,
              category: item.category ?? "other",
              difficulty: item.difficulty ?? 2,
              grammar: item.grammar,
              notes: item.notes,
            }),
          });
          if (res.status === 409) {
            skipped += 1;
            continue;
          }
          const data = await res.json();
          if (!res.ok) {
            failed += 1;
            continue;
          }
          added += 1;
          addedProblems.push(data.problem as Problem);
        } catch {
          failed += 1;
        }
      }

      setProblems((prev) => [...prev, ...addedProblems]);
      window.alert(
        `取り込み完了: 追加 ${added} 件 / 重複スキップ ${skipped} 件 / 失敗 ${failed} 件`,
      );
    } catch {
      window.alert("JSONファイルの読み込みに失敗しました。");
    } finally {
      setImporting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (difficulty !== "all" && p.difficulty !== difficulty) return false;
      if (q) {
        const hay =
          `${p.japanese} ${p.english} ${p.grammar ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [problems, category, difficulty, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const accuracyOf = (p: Problem) => {
      const s = stats[p.id];
      if (!s) return -1;
      const total = s.correctCount + s.incorrectCount;
      if (total === 0) return -1;
      return s.correctCount / total;
    };
    switch (sortKey) {
      case "newest":
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "oldest":
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "category":
        list.sort(
          (a, b) =>
            a.category.localeCompare(b.category) ||
            a.difficulty - b.difficulty ||
            b.createdAt.localeCompare(a.createdAt),
        );
        break;
      case "difficulty":
        list.sort(
          (a, b) =>
            a.difficulty - b.difficulty ||
            a.category.localeCompare(b.category) ||
            b.createdAt.localeCompare(a.createdAt),
        );
        break;
      case "accuracy":
        list.sort((a, b) => {
          const accA = accuracyOf(a);
          const accB = accuracyOf(b);
          if (accA === -1 && accB === -1) return 0;
          if (accA === -1) return 1;
          if (accB === -1) return -1;
          return accA - accB;
        });
        break;
    }
    return list;
  }, [filtered, sortKey, stats]);

  const handleAdded = (result: { problem: Problem }) => {
    setProblems((prev) => [...prev, result.problem]);
  };

  const handleDeleteOne = async (id: string) => {
    if (!window.confirm("この問題を削除しますか？")) return;
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      if (isCustomProblemId(id)) {
        // ブラウザ保存（localStorage）の自作問題
        deleteCustomProblem(id);
      } else {
        const res = await fetch(`/api/problems?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "削除に失敗しました");
        }
      }
      setProblems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (category === "all") return;
    const targetLabel = CATEGORY_LABELS[category];
    if (
      !window.confirm(
        `カテゴリ「${targetLabel}」の問題をすべて削除しますか？（${filtered.length} 問が対象）`,
      )
    ) {
      return;
    }
    // ブラウザ保存の自作問題を先に削除
    problems
      .filter((p) => p.category === category && isCustomProblemId(p.id))
      .forEach((p) => deleteCustomProblem(p.id));

    const res = await fetch(`/api/problems?category=${category}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      window.alert("削除に失敗しました（共有プール分）");
      return;
    }
    setProblems((prev) => prev.filter((p) => p.category !== category));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text shadow-sm hover:bg-slate-50"
        >
          ブラウザ保存分をエクスポート
        </button>
        {allowPool && (
          <>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-brand-text shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {importing ? "取り込み中…" : "JSONを取り込み"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg border border-brand-primary bg-white px-4 py-2 text-sm font-medium text-brand-primary shadow-sm hover:bg-blue-50"
        >
          + 文章を追加
        </button>
      </div>

      <AddProblemDialog
        open={addOpen}
        allowPool={allowPool}
        allowTranslate={allowAI}
        onClose={() => setAddOpen(false)}
        onAdded={handleAdded}
      />

      <section className="rounded-xl bg-brand-surface p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索（日本語・英訳・タグ）"
            className="flex-1 min-w-[200px] rounded border border-slate-300 bg-white px-3 py-1.5"
          />

          <label className="flex items-center gap-2">
            <span className="text-brand-muted">カテゴリ</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Category | "all")
              }
            >
              <option value="all">すべて</option>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-brand-muted">難易度</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(
                  e.target.value === "all"
                    ? "all"
                    : (Number(e.target.value) as Difficulty),
                )
              }
            >
              <option value="all">すべて</option>
              {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-brand-muted">並び替え</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-brand-muted">
          <div>
            {filtered.length} / {problems.length} 問
          </div>
          {category !== "all" && filtered.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteCategory}
              className="text-xs text-red-600 hover:underline"
            >
              「{CATEGORY_LABELS[category]}」カテゴリを一括削除
            </button>
          )}
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="rounded-xl bg-brand-surface p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-brand-muted">該当する問題はありません。</div>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((p) => {
            const s = stats[p.id];
            const total = s ? s.correctCount + s.incorrectCount : 0;
            const accuracy = total > 0 ? s!.correctCount / total : null;
            const isBusy = busyIds.has(p.id);
            return (
              <li
                key={p.id}
                className="rounded-xl bg-brand-surface p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                    {DIFFICULTY_LABELS[p.difficulty]}
                  </span>
                  {p.grammar && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                      {p.grammar}
                    </span>
                  )}
                  {p.tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="text-base font-medium text-brand-text">
                  {p.japanese}
                </div>
                <div className="text-sm text-brand-muted">{p.english}</div>
                {p.notes && (
                  <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                    📝 {p.notes}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-xs text-brand-muted">
                  <div>
                    {total > 0 ? (
                      <>
                        ✓ {s!.correctCount} / ✗ {s!.incorrectCount}
                        {accuracy !== null && (
                          <span className="ml-2 font-medium text-brand-text">
                            正答率 {formatPercent(accuracy)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>未回答</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(p.id)}
                    disabled={isBusy}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    {isBusy ? "削除中…" : "削除"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
