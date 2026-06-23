import Link from "next/link";
import { loadProblems } from "@/lib/problems";
import { StatsView } from "@/components/StatsView";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const problems = await loadProblems();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-text">学習統計</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-brand-primary hover:underline">
            ホーム
          </Link>
          <Link href="/train" className="text-brand-primary hover:underline">
            トレーニング
          </Link>
          <Link href="/problems" className="text-brand-primary hover:underline">
            問題プール
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <StatsView problems={problems} />
    </main>
  );
}
