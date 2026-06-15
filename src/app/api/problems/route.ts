import { NextResponse } from "next/server";
import { loadProblems, saveProblems } from "@/lib/problems";
import { Category, CATEGORY_LABELS } from "@/lib/types";

export async function GET() {
  const problems = await loadProblems();
  return NextResponse.json({ problems });
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
