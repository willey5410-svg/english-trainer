import {
  CATEGORY_LABELS,
  Category,
  DIFFICULTY_LABELS,
  Difficulty,
  Problem,
  ProblemStats,
} from "./types";

export type AggregateStats = {
  totalProblems: number;
  answeredProblems: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalAnswers: number;
  accuracy: number; // 0..1
};

export type GroupedStats<K extends string | number> = {
  key: K;
  label: string;
  problemCount: number;
  answeredCount: number;
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number;
};

export type WeakProblem = {
  problem: Problem;
  stats: ProblemStats;
  total: number;
  incorrectRate: number;
};

export const computeAggregate = (
  problems: Problem[],
  stats: Record<string, ProblemStats>,
): AggregateStats => {
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let answeredProblems = 0;
  for (const p of problems) {
    const s = stats[p.id];
    if (!s) continue;
    const t = s.correctCount + s.incorrectCount;
    if (t === 0) continue;
    answeredProblems += 1;
    totalCorrect += s.correctCount;
    totalIncorrect += s.incorrectCount;
  }
  const totalAnswers = totalCorrect + totalIncorrect;
  return {
    totalProblems: problems.length,
    answeredProblems,
    totalCorrect,
    totalIncorrect,
    totalAnswers,
    accuracy: totalAnswers === 0 ? 0 : totalCorrect / totalAnswers,
  };
};

export const computeByCategory = (
  problems: Problem[],
  stats: Record<string, ProblemStats>,
): GroupedStats<Category>[] => {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  return categories.map((c) => {
    const inCategory = problems.filter((p) => p.category === c);
    let correct = 0;
    let incorrect = 0;
    let answered = 0;
    for (const p of inCategory) {
      const s = stats[p.id];
      if (!s) continue;
      const t = s.correctCount + s.incorrectCount;
      if (t === 0) continue;
      answered += 1;
      correct += s.correctCount;
      incorrect += s.incorrectCount;
    }
    const total = correct + incorrect;
    return {
      key: c,
      label: CATEGORY_LABELS[c],
      problemCount: inCategory.length,
      answeredCount: answered,
      correct,
      incorrect,
      total,
      accuracy: total === 0 ? 0 : correct / total,
    };
  });
};

export const computeByDifficulty = (
  problems: Problem[],
  stats: Record<string, ProblemStats>,
): GroupedStats<Difficulty>[] => {
  const difficulties: Difficulty[] = [1, 2, 3];
  return difficulties.map((d) => {
    const inDifficulty = problems.filter((p) => p.difficulty === d);
    let correct = 0;
    let incorrect = 0;
    let answered = 0;
    for (const p of inDifficulty) {
      const s = stats[p.id];
      if (!s) continue;
      const t = s.correctCount + s.incorrectCount;
      if (t === 0) continue;
      answered += 1;
      correct += s.correctCount;
      incorrect += s.incorrectCount;
    }
    const total = correct + incorrect;
    return {
      key: d,
      label: DIFFICULTY_LABELS[d],
      problemCount: inDifficulty.length,
      answeredCount: answered,
      correct,
      incorrect,
      total,
      accuracy: total === 0 ? 0 : correct / total,
    };
  });
};

export const computeWeakProblems = (
  problems: Problem[],
  stats: Record<string, ProblemStats>,
  limit = 10,
): WeakProblem[] => {
  const items: WeakProblem[] = [];
  for (const p of problems) {
    const s = stats[p.id];
    if (!s) continue;
    const total = s.correctCount + s.incorrectCount;
    if (total === 0) continue;
    if (s.incorrectCount === 0) continue;
    items.push({
      problem: p,
      stats: s,
      total,
      incorrectRate: s.incorrectCount / total,
    });
  }
  items.sort((a, b) => {
    if (b.incorrectRate !== a.incorrectRate) {
      return b.incorrectRate - a.incorrectRate;
    }
    return b.stats.incorrectCount - a.stats.incorrectCount;
  });
  return items.slice(0, limit);
};

export const computeRecentlyAnswered = (
  problems: Problem[],
  stats: Record<string, ProblemStats>,
  limit = 10,
): { problem: Problem; stats: ProblemStats }[] => {
  const problemMap = new Map(problems.map((p) => [p.id, p]));
  const entries = Object.values(stats)
    .filter((s) => s.lastAnsweredAt && problemMap.has(s.problemId))
    .sort(
      (a, b) =>
        new Date(b.lastAnsweredAt).getTime() -
        new Date(a.lastAnsweredAt).getTime(),
    )
    .slice(0, limit);
  return entries.map((s) => ({ problem: problemMap.get(s.problemId)!, stats: s }));
};

export const formatPercent = (rate: number): string => {
  return `${Math.round(rate * 100)}%`;
};
