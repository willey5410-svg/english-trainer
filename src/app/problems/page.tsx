import Link from "next/link";
import { loadProblems } from "@/lib/problems";
import { ProblemListView } from "@/components/ProblemListView";

export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const problems = await loadProblems();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-text">問題プール</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="text-brand-primary hover:underline">
            トレーニング
          </Link>
          <Link href="/stats" className="text-brand-primary hover:underline">
            学習統計
          </Link>
        </nav>
      </header>
      <ProblemListView initialProblems={problems} />
    </main>
  );
}
