import { loadProblems } from "@/lib/problems";
import { HomeView } from "@/components/HomeView";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const problems = await loadProblems();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-text">
          瞬間英作文トレーナー
        </h1>
        <ThemeToggle />
      </header>
      <HomeView initialProblems={problems} />
    </main>
  );
}
