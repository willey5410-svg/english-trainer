import fs from "fs/promises";
import path from "path";
import { Problem } from "./types";

const DATA_FILE = path.join(process.cwd(), "data", "problems.json");

export const loadProblems = async (): Promise<Problem[]> => {
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

export const saveProblems = async (problems: Problem[]): Promise<void> => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(problems, null, 2), "utf-8");
};

export const appendProblems = async (newProblems: Problem[]): Promise<Problem[]> => {
  const existing = await loadProblems();
  const existingJapanese = new Set(existing.map((p) => p.japanese.trim()));
  const deduped = newProblems.filter((p) => !existingJapanese.has(p.japanese.trim()));
  const merged = [...existing, ...deduped];
  await saveProblems(merged);
  return merged;
};
