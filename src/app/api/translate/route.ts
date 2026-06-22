import { NextResponse } from "next/server";
import { translateToEnglish } from "@/lib/gemini";
import { checkAiAccess } from "@/lib/access";
import { Difficulty } from "@/lib/types";

const isDifficulty = (v: unknown): v is Difficulty =>
  typeof v === "number" && [1, 2, 3, 4, 5].includes(v);

export async function POST(request: Request) {
  // AI 翻訳は Gemini API を消費する。ローカル、または APP_ACCESS_CODE が
  // 一致する場合のみ許可する（詳細は src/lib/access.ts）。
  const access = checkAiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();

    const japanese =
      typeof body.japanese === "string" ? body.japanese.trim() : "";
    if (!japanese) {
      return NextResponse.json(
        { error: "日本語文が入力されていません" },
        { status: 400 },
      );
    }

    const difficulty = isDifficulty(body.difficulty)
      ? body.difficulty
      : undefined;

    const result = await translateToEnglish({ japanese, difficulty });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json(
      { error: `英訳に失敗しました: ${message}` },
      { status: 500 },
    );
  }
}
