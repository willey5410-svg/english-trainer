"use client";

type Props = {
  sessionAnswered: number;
  sessionCorrect: number;
  totalProblems: number;
};

export const StatsBar = ({
  sessionAnswered,
  sessionCorrect,
  totalProblems,
}: Props) => {
  const rate =
    sessionAnswered > 0
      ? Math.round((sessionCorrect / sessionAnswered) * 100)
      : 0;
  return (
    <div className="flex items-center justify-between text-sm text-brand-muted">
      <div>
        セッション: {sessionCorrect} / {sessionAnswered} 正解
        {sessionAnswered > 0 && (
          <span className="ml-2 font-medium text-brand-text">{rate}%</span>
        )}
      </div>
      <div>問題プール: {totalProblems} 問</div>
    </div>
  );
};
