"use client";

import {
  AppSettings,
  CATEGORY_LABELS,
  Category,
  DIFFICULTY_LABELS,
  Difficulty,
} from "@/lib/types";

type Props = {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  availableCount: number;
};

export const FilterBar = ({ settings, onChange, availableCount }: Props) => {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-brand-muted">カテゴリ</span>
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1"
          value={settings.filterCategory}
          onChange={(e) =>
            onChange({
              ...settings,
              filterCategory: e.target.value as Category | "all",
            })
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
          value={settings.filterDifficulty}
          onChange={(e) =>
            onChange({
              ...settings,
              filterDifficulty:
                e.target.value === "all"
                  ? "all"
                  : (Number(e.target.value) as Difficulty),
            })
          }
        >
          <option value="all">すべて</option>
          {([1, 2, 3] as Difficulty[]).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
      </label>

      <label
        className="flex items-center gap-2"
        title="不正解率・経過時間・未回答ボーナスを統合したスコアで重み付き抽選します"
      >
        <input
          type="checkbox"
          checked={settings.weakProblemMode}
          onChange={(e) =>
            onChange({ ...settings, weakProblemMode: e.target.checked })
          }
        />
        <span>苦手 / 復習優先</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.strictMode}
          onChange={(e) =>
            onChange({ ...settings, strictMode: e.target.checked })
          }
        />
        <span>厳密判定</span>
      </label>

      <div className="ml-auto text-brand-muted">対象 {availableCount} 問</div>
    </div>
  );
};
