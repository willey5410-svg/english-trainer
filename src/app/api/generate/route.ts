import { NextResponse } from "next/server";
import {
  GeminiRateLimitError,
  GeminiUnavailableError,
  generateProblems,
  GenerateParams,
} from "@/lib/gemini";
import { appendProblems, isPoolWritable, loadProblems } from "@/lib/problems";
import { CATEGORY_LABELS, Category, Difficulty } from "@/lib/types";
import { checkAiAccess } from "@/lib/access";

const isCategory = (v: unknown): v is Category =>
  typeof v === "string" && v in CATEGORY_LABELS;

const isDifficulty = (v: unknown): v is Difficulty =>
  typeof v === "number" && [1, 2, 3].includes(v);

export async function POST(request: Request) {
  // 問題生成は Gemini API を消費する。ローカル、または APP_ACCESS_CODE が
  // 一致する場合のみ許可する（採点・英訳と同じアクセス制御。詳細は src/lib/access.ts）。
  const access = checkAiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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

    // 重複回避用の既存日本語文。共有プール（ファイル）の同カテゴリ分に加えて、
    // クライアントが持つ既存文（ブラウザ保存分を含む）も受け取って統合する。
    const fileProblems = await loadProblems();
    const fileJapanese = fileProblems
      .filter((p) => p.category === body.category)
      .map((p) => p.japanese);
    const clientJapanese: string[] = Array.isArray(body.existingJapanese)
      ? body.existingJapanese.filter((s: unknown): s is string => typeof s === "string")
      : [];
    const existingJapanese = Array.from(
      new Set([...fileJapanese, ...clientJapanese]),
    );

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

    // ローカル開発時、または公開環境でGitHub連携が設定されている場合は
    // 共有プール（data/problems.json）へ直接保存する。それ以外の公開環境では
    // 生成結果を返してクライアント側でブラウザ（localStorage）に保存させる。
    if (isPoolWritable()) {
      const merged = await appendProblems(newProblems);
      return NextResponse.json({
        generated: newProblems.length,
        totalProblems: merged.length,
        problems: newProblems,
        requested: count,
      });
    }

    return NextResponse.json({
      generated: newProblems.length,
      problems: newProblems,
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
