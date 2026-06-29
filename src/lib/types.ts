export type Category =
  | "daily"
  | "business"
  | "travel"
  | "school"
  | "it"
  | "other";

export const CATEGORY_LABELS: Record<Category, string> = {
  daily: "日常会話",
  business: "ビジネス",
  travel: "旅行",
  school: "学校",
  it: "IT",
  other: "その他",
};

export type Difficulty = 1 | 2 | 3;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "★★★☆☆ 中級",
  2: "★★★★☆ 上級",
  3: "★★★★★ 最上級",
};

export type Problem = {
  id: string;
  japanese: string;
  english: string;
  category: Category;
  difficulty: Difficulty;
  grammar?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
};

export type ProblemStats = {
  problemId: string;
  correctCount: number;
  incorrectCount: number;
  lastAnsweredAt: string;
};

export type AppSettings = {
  filterCategory: Category | "all";
  filterDifficulty: Difficulty | "all";
  weakProblemMode: boolean;
  strictMode: boolean;
  dailyCount: number;
};
