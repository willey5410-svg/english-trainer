import Link from "next/link";
import { loadProblems } from "@/lib/problems";
import { TrainingApp } from "@/components/TrainingApp";

export const dynamic = "force-dynamic";

// 問題生成・共有プールへの保存はファイル書き込みが必要なため、ローカル開発時のみ許可する。
const allowGenerate = !process.env.VERCEL;
// AI 採点・英訳は、ローカル または アクセスコード設定済み のとき利用可能にする。
// （実際の許可判定はサーバー側の checkAiAccess でも行う）
const allowAI = !process.env.VERCEL || !!process.env.APP_ACCESS_CODE;

export default async function Page() {
  const problems = await loadProblems();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-text">
          瞬間英作文トレーナー
        </h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/problems" className="text-brand-primary hover:underline">
            問題プール
          </Link>
          <Link href="/stats" className="text-brand-primary hover:underline">
            学習統計
          </Link>
        </nav>
      </header>
      <TrainingApp
        initialProblems={problems}
        allowGenerate={allowGenerate}
        allowGrade={allowAI}
      />
    </main>
  );
}
