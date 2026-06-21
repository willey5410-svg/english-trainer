import { NextResponse } from "next/server";
import { gradeAnswer } from "@/lib/gemini";

export async function POST(request: Request) {
  // AI 採点は Gemini API を消費するため、デプロイ環境（Vercel）では無効化する。
  // 問題生成と同じく、ローカル開発環境でのみ利用する運用。
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "この環境では AI 採点は無効です（ローカル環境で利用してください）" },
      { status: 403 },
    );
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
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json(
      { error: `採点に失敗しました: ${message}` },
      { status: 500 },
    );
  }
}
