import { NextResponse } from "next/server";
import { appendProblems, loadProblems, saveProblems } from "@/lib/problems";
import {
  Category,
  CATEGORY_LABELS,
  Difficulty,
  Problem,
} from "@/lib/types";

const isCategory = (v: unknown): v is Category =>
  typeof v === "string" && v in CATEGORY_LABELS;

const isDifficulty = (v: unknown): v is Difficulty =>
  typeof v === "number" && [1, 2, 3, 4, 5].includes(v);

export async function GET() {
  const problems = await loadProblems();
  return NextResponse.json({ problems });
}

export async function POST(request: Request) {
  // 共有プール（data/problems.json）への書き込みはローカル開発時のみ許可する。
  // 公開環境ではブラウザ保存（localStorage）を使うためここには来ない。
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "この環境では共有プールへの追加は無効です" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    const japanese =
      typeof body.japanese === "string" ? body.japanese.trim() : "";
    const english = typeof body.english === "string" ? body.english.trim() : "";
    if (!japanese || !english) {
      return NextResponse.json(
        { error: "日本語文と英訳は必須です" },
        { status: 400 },
      );
    }
    if (!isCategory(body.category)) {
      return NextResponse.json({ error: "category が不正です" }, { status: 400 });
    }
    if (!isDifficulty(body.difficulty)) {
      return NextResponse.json(
        { error: "difficulty が不正です" },
        { status: 400 },
      );
    }

    const grammar =
      typeof body.grammar === "string" && body.grammar.trim()
        ? body.grammar.trim()
        : undefined;
    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : undefined;

    const problem: Problem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      japanese,
      english,
      category: body.category,
      difficulty: body.difficulty,
      grammar,
      notes,
      createdAt: new Date().toISOString(),
    };

    const existing = await loadProblems();
    if (existing.some((p) => p.japanese.trim() === japanese)) {
      return NextResponse.json(
        { error: "同じ日本語文の問題が既に存在します" },
        { status: 409 },
      );
    }

    const merged = await appendProblems([problem]);
    return NextResponse.json({ problem, totalProblems: merged.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json(
      { error: `追加に失敗しました: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const category = url.searchParams.get("category");
  const all = url.searchParams.get("all");

  const problems = await loadProblems();

  if (all === "true") {
    await saveProblems([]);
    return NextResponse.json({ deleted: problems.length, remaining: 0 });
  }

  if (id) {
    const remaining = problems.filter((p) => p.id !== id);
    await saveProblems(remaining);
    return NextResponse.json({
      deleted: problems.length - remaining.length,
      remaining: remaining.length,
    });
  }

  if (category) {
    if (!(category in CATEGORY_LABELS)) {
      return NextResponse.json({ error: "category が不正です" }, { status: 400 });
    }
    const remaining = problems.filter((p) => p.category !== (category as Category));
    await saveProblems(remaining);
    return NextResponse.json({
      deleted: problems.length - remaining.length,
      remaining: remaining.length,
    });
  }

  return NextResponse.json(
    { error: "id, category, all=true のいずれかを指定してください" },
    { status: 400 },
  );
}
