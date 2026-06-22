"use client";

import { useState } from "react";
import { setAccessCode } from "@/lib/access";

type Props = {
  // コードを保存したあとに呼ばれる（元の操作を再試行するために使う）
  onSubmit: () => void;
};

export const AccessCodeForm = ({ onSubmit }: Props) => {
  const [code, setCode] = useState("");

  const submit = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setAccessCode(trimmed);
    onSubmit();
  };

  return (
    <div className="rounded-md bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
      <p className="mb-2 text-sm text-amber-800">
        AI機能のアクセスコードを入力してください
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="アクセスコード"
          autoComplete="off"
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-brand-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!code.trim()}
          className="rounded bg-brand-primary px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          送信
        </button>
      </div>
    </div>
  );
};
