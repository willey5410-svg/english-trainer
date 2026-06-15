"use client";

import { DiffSegment } from "@/lib/diff";

type Props = {
  segments: DiffSegment[];
};

export const DiffView = ({ segments }: Props) => {
  const userSide = segments.filter((s) => s.type === "match" || s.type === "user-only");
  const answerSide = segments.filter((s) => s.type === "match" || s.type === "answer-only");

  const renderToken = (text: string | undefined, idx: number, className: string) => {
    if (!text) return null;
    const needsSpace = !/^[.,!?;:]/.test(text);
    return (
      <span key={idx}>
        {needsSpace && idx > 0 ? " " : ""}
        <span className={className}>{text}</span>
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-brand-muted mb-1">あなたの解答</div>
        <div className="text-base leading-relaxed">
          {userSide.map((seg, idx) =>
            seg.type === "match"
              ? renderToken(seg.userText, idx, "text-brand-text")
              : renderToken(seg.userText, idx, "text-red-600 line-through decoration-red-500"),
          )}
          {userSide.length === 0 && (
            <span className="text-brand-muted italic">(入力なし)</span>
          )}
        </div>
      </div>
      <div>
        <div className="text-xs text-brand-muted mb-1">正解</div>
        <div className="text-base leading-relaxed">
          {answerSide.map((seg, idx) =>
            seg.type === "match"
              ? renderToken(seg.answerText, idx, "text-brand-text")
              : renderToken(seg.answerText, idx, "text-emerald-700 bg-emerald-100 rounded px-1"),
          )}
        </div>
      </div>
    </div>
  );
};
