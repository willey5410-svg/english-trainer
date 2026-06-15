import Link from "next/link";
import { loadProblems } from "@/lib/problems";
import { TrainingApp } from "@/components/TrainingApp";

export const dynamic = "force-dynamic";

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
      <TrainingApp initialProblems={problems} />
    </main>
  );
}
