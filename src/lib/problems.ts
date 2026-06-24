import fs from "fs/promises";
import path from "path";
import { Problem } from "./types";
import {
  isGithubPoolConfigured,
  loadProblemsFromGithub,
  saveProblemsToGithub,
} from "./githubPool";

const DATA_FILE = path.join(process.cwd(), "data", "problems.json");

// 公開環境（Vercel）はファイルシステムへの書き込みが永続化されないため、
// GitHub連携（GITHUB_TOKEN / GITHUB_REPO）が設定されている場合はそちらを使う。
export const isPoolWritable = (): boolean =>
  !process.env.VERCEL || isGithubPoolConfigured();

const isGithubBackend = (): boolean => !!process.env.VERCEL && isGithubPoolConfigured();

const loadProblemsFromFile = async (): Promise<Problem[]> => {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Problem[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
};

const saveProblemsToFile = async (problems: Problem[]): Promise<void> => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(problems, null, 2), "utf-8");
};

export const loadProblems = async (): Promise<Problem[]> =>
  isGithubBackend() ? loadProblemsFromGithub() : loadProblemsFromFile();

export const saveProblems = async (
  problems: Problem[],
  commitMessage = "問題プールを更新",
): Promise<void> => {
  if (isGithubBackend()) {
    await saveProblemsToGithub(problems, commitMessage);
    return;
  }
  await saveProblemsToFile(problems);
};

export const appendProblems = async (
  newProblems: Problem[],
  commitMessage?: string,
): Promise<Problem[]> => {
  const existing = await loadProblems();
  const existingJapanese = new Set(existing.map((p) => p.japanese.trim()));
  const deduped = newProblems.filter((p) => !existingJapanese.has(p.japanese.trim()));
  const merged = [...existing, ...deduped];
  await saveProblems(
    merged,
    commitMessage ?? `公開環境から問題を${deduped.length}件追加`,
  );
  return merged;
};
