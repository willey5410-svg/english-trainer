import { NextResponse } from "next/server";
import {
  GeminiRateLimitError,
  GeminiUnavailableError,
  gradeAnswer,
} from "@/lib/gemini";
import { checkAiAccess } from "@/lib/access";

export async function POST(request: Request) {
  // AI 採点は Gemini API を消費する。ローカル、または APP_ACCESS_CODE が
  // 一致する場合のみ許可する（詳細は src/lib/access.ts）。
  const access = checkAiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();

    const japanese =
      typeof body.japanese === "string" ? body.japanese.trim() : "";
    const reference =
      typeof body.reference === "string" ? body.reference.trim() : "";
    const userAnswer =
      typeof body.userAnswer === "string" ? body.userAnswer.trim() : "";

    if (!japanese || !reference) {
      return NextResponse.json(
        { error: "japanese と reference は必須です" },
        { status: 400 },
      );
    }
    if (!userAnswer) {
      return NextResponse.json(
        { error: "英訳が入力されていません" },
        { status: 400 },
      );
    }

    const result = await gradeAnswer({ japanese, reference, userAnswer });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof GeminiUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json(
      { error: `採点に失敗しました: ${message}` },
      { status: 500 },
    );
  }
}
