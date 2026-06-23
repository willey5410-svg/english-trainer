import { NextResponse } from "next/server";
import {
  GeminiRateLimitError,
  GeminiUnavailableError,
  generateProblems,
  GenerateParams,
} from "@/lib/gemini";
import { appendProblems, loadProblems } from "@/lib/problems";
import { CATEGORY_LABELS, Category, Difficulty } from "@/lib/types";

const isCategory = (v: unknown): v is Category =>
  typeof v === "string" && v in CATEGORY_LABELS;

const isDifficulty = (v: unknown): v is Difficulty =>
  typeof v === "number" && [1, 2, 3].includes(v);

export async function POST(request: Request) {
  // 問題生成は Gemini API を消費するため、デプロイ環境（Vercel）では無効化する。
  // 生成はローカル開発環境でのみ行い、結果を data/problems.json に保存して再デプロイする運用。
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "この環境では問題生成は無効です（ローカル環境で生成してください）" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    if (!isCategory(body.category)) {
      return NextResponse.json({ error: "category が不正です" }, { status: 400 });
    }
    if (!isDifficulty(body.difficulty)) {
      return NextResponse.json({ error: "difficulty が不正です" }, { status: 400 });
    }
    const count = Number(body.count);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      return NextResponse.json(
        { error: "count は 1〜50 の整数で指定してください" },
        { status: 400 },
      );
    }
    const grammar =
      typeof body.grammar === "string" && body.grammar.trim()
        ? body.grammar.trim()
        : undefined;

    const existing = await loadProblems();
    const existingJapanese = existing
      .filter((p) => p.category === body.category)
      .map((p) => p.japanese);

    const params: GenerateParams = {
      category: body.category,
      difficulty: body.difficulty,
      grammar,
      count,
      existingJapanese,
    };

    const newProblems = await generateProblems(params);

    if (newProblems.length === 0) {
      return NextResponse.json(
        { error: "生成された問題がありませんでした。再度お試しください。" },
        { status: 502 },
      );
    }

    const merged = await appendProblems(newProblems);

    return NextResponse.json({
      generated: newProblems.length,
      totalProblems: merged.length,
      requested: count,
    });
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof GeminiUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json(
      { error: `問題生成に失敗しました: ${message}` },
      { status: 500 },
    );
  }
}
