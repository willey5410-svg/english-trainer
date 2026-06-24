import { Problem } from "./types";

// 公開環境（Vercel）から共有プール（data/problems.json）へ直接コミットするための
// GitHub Contents API ラッパー。GITHUB_TOKEN / GITHUB_REPO が設定されているときのみ有効。

const GITHUB_API = "https://api.github.com";
const FILE_PATH = "data/problems.json";

type GithubConfig = {
  token: string;
  repo: string;
  branch: string;
};

const getConfig = (): GithubConfig | null => {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;
  return { token, repo, branch: process.env.GITHUB_BRANCH ?? "main" };
};

export const isGithubPoolConfigured = (): boolean => getConfig() !== null;

type GithubFile = { content: string; sha: string };

const fetchFile = async (config: GithubConfig): Promise<GithubFile | null> => {
  const res = await fetch(
    `${GITHUB_API}/repos/${config.repo}/contents/${FILE_PATH}?ref=${config.branch}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHubからの読み込みに失敗しました（${res.status}）`);
  }
  const data = await res.json();
  return { content: data.content, sha: data.sha };
};

export const loadProblemsFromGithub = async (): Promise<Problem[]> => {
  const config = getConfig();
  if (!config) throw new Error("GitHub連携が設定されていません");
  const file = await fetchFile(config);
  if (!file) return [];
  const json = Buffer.from(file.content, "base64").toString("utf-8");
  return JSON.parse(json) as Problem[];
};

export const saveProblemsToGithub = async (
  problems: Problem[],
  message: string,
): Promise<void> => {
  const config = getConfig();
  if (!config) throw new Error("GitHub連携が設定されていません");

  const existing = await fetchFile(config);
  const content = Buffer.from(
    `${JSON.stringify(problems, null, 2)}\n`,
    "utf-8",
  ).toString("base64");

  const res = await fetch(
    `${GITHUB_API}/repos/${config.repo}/contents/${FILE_PATH}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content,
        branch: config.branch,
        sha: existing?.sha,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHubへの保存に失敗しました（${res.status}）: ${body}`);
  }
};
