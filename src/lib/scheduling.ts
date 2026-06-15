import { Problem, ProblemStats } from "./types";

const HOUR_MS = 60 * 60 * 1000;

export const SCHEDULING = {
  baseIntervalMs: HOUR_MS, // 復習間隔の基準（1時間）
  maxIntervalDays: 30, // 上限30日
  weights: {
    base: 0.3,
    incorrectRate: 1.5,
    overdueRatio: 0.5,
    untriedBonus: 1.2,
  },
  overdueClamp: 2.0,
} as const;

export type Priority = {
  score: number;
  expectedIntervalMs: number;
  elapsedMs: number;
  overdueRatio: number;
  isUntried: boolean;
  nextReviewAt: Date | null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const computeExpectedInterval = (stats: ProblemStats): number => {
  const net = stats.correctCount - stats.incorrectCount;
  if (net <= 0) {
    return SCHEDULING.baseIntervalMs;
  }
  const raw = SCHEDULING.baseIntervalMs * Math.pow(2, net);
  const cap = SCHEDULING.maxIntervalDays * 24 * HOUR_MS;
  return Math.min(raw, cap);
};

export const computePriority = (
  problem: Problem,
  stats: ProblemStats | undefined,
  now: number = Date.now(),
): Priority => {
  if (!stats || stats.correctCount + stats.incorrectCount === 0) {
    return {
      score:
        SCHEDULING.weights.base +
        SCHEDULING.weights.untriedBonus,
      expectedIntervalMs: SCHEDULING.baseIntervalMs,
      elapsedMs: 0,
      overdueRatio: 1,
      isUntried: true,
      nextReviewAt: null,
    };
  }

  const total = stats.correctCount + stats.incorrectCount;
  const incorrectRate = stats.incorrectCount / total;

  const expectedIntervalMs = computeExpectedInterval(stats);
  const lastTime = stats.lastAnsweredAt
    ? new Date(stats.lastAnsweredAt).getTime()
    : now;
  const elapsedMs = Math.max(0, now - lastTime);
  const overdueRatio = clamp(elapsedMs / expectedIntervalMs, 0, SCHEDULING.overdueClamp);

  const score =
    SCHEDULING.weights.base +
    SCHEDULING.weights.incorrectRate * incorrectRate +
    SCHEDULING.weights.overdueRatio * overdueRatio;

  return {
    score,
    expectedIntervalMs,
    elapsedMs,
    overdueRatio,
    isUntried: false,
    nextReviewAt: new Date(lastTime + expectedIntervalMs),
  };
};

export const pickByPriority = <T extends { id: string }>(
  problems: T[],
  getStats: (p: T) => ProblemStats | undefined,
  options: { excludeIds?: string[]; now?: number } = {},
): T | null => {
  if (problems.length === 0) return null;

  const excludeIds = options.excludeIds ?? [];
  const excludeSet = new Set(excludeIds);
  const filtered = problems.filter((p) => !excludeSet.has(p.id));
  const candidates = filtered.length > 0 ? filtered : problems;

  const now = options.now ?? Date.now();
  const weights = candidates.map((p) =>
    computePriority(p as unknown as Problem, getStats(p), now).score,
  );
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
};

export const formatReviewTiming = (priority: Priority, now: number = Date.now()): string => {
  if (priority.isUntried) return "未回答";
  if (!priority.nextReviewAt) return "—";
  const diffMs = priority.nextReviewAt.getTime() - now;
  if (diffMs <= 0) {
    const overdueMs = -diffMs;
    return `復習推奨（${humanizeDuration(overdueMs)} 経過）`;
  }
  return `${humanizeDuration(diffMs)} 後`;
};

const humanizeDuration = (ms: number): string => {
  const absMs = Math.abs(ms);
  const minutes = Math.round(absMs / (60 * 1000));
  if (minutes < 60) return `${minutes} 分`;
  const hours = Math.round(absMs / HOUR_MS);
  if (hours < 24) return `${hours} 時間`;
  const days = Math.round(absMs / (24 * HOUR_MS));
  return `${days} 日`;
};
