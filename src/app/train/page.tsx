import Link from "next/link";
import { loadProblems } from "@/lib/problems";
import { TrainingApp } from "@/components/TrainingApp";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

// 共有プール（data/problems.json）への保存はファイル書き込みが必要なため、ローカル開発時のみ。
// 公開環境では生成結果をブラウザ（localStorage）に保存する。
const allowPool = !process.env.VERCEL;
// AI 採点・英訳・問題生成は、ローカル または アクセスコード設定済み のとき利用可能。
// （実際の許可判定はサーバー側の checkAiAccess でも行う）
const allowAI = !process.env.VERCEL || !!process.env.APP_ACCESS_CODE;

export default async function TrainPage({
  searchParams,
}: {
  searchParams: Promise<{ daily?: string }>;
}) {
  const problems = await loadProblems();
  // ホームの「今日の課題を始める」から ?daily=1 で来たら、課題モードで起動する。
  const { daily } = await searchParams;
  const startInDaily = daily === "1";
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-text">トレーニング</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-brand-primary hover:underline">
            ホーム
          </Link>
          <Link href="/problems" className="text-brand-primary hover:underline">
            問題プール
          </Link>
          <Link href="/stats" className="text-brand-primary hover:underline">
            学習統計
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <TrainingApp
        initialProblems={problems}
        allowGenerate={allowAI}
        allowPool={allowPool}
        allowGrade={allowAI}
        startInDaily={startInDaily}
      />
    </main>
  );
}
