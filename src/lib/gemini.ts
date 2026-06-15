import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import {
  CATEGORY_LABELS,
  Category,
  DIFFICULTY_LABELS,
  Difficulty,
  Problem,
} from "./types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const getClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。.env.local を確認してください。",
    );
  }
  return new GoogleGenerativeAI(apiKey);
};

export type GenerateParams = {
  category: Category;
  difficulty: Difficulty;
  grammar?: string;
  count: number;
  existingJapanese?: string[];
};

type GeneratedItem = {
  japanese: string;
  english: string;
  notes?: string;
  tags?: string[];
};

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          japanese: { type: SchemaType.STRING },
          english: { type: SchemaType.STRING },
          notes: { type: SchemaType.STRING },
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["japanese", "english"],
      },
    },
  },
  required: ["items"],
};

const buildPrompt = (params: GenerateParams): string => {
  const categoryLabel = CATEGORY_LABELS[params.category];
  const difficultyLabel = DIFFICULTY_LABELS[params.difficulty];
  const grammarLine = params.grammar
    ? `- 文型/文法: ${params.grammar}（必ずこの文法を含む例文にすること）`
    : "- 文型/文法: 指定なし（自然なバリエーションで）";

  const existingList =
    params.existingJapanese && params.existingJapanese.length > 0
      ? `\n\n## 既存の問題（重複を避けてください、最大50件まで表示）\n${params.existingJapanese
          .slice(0, 50)
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n")}`
      : "";

  return `あなたは英語学習教材の作成者です。日本語話者向けの「瞬間英作文」用の日英ペアを作成してください。

## 生成条件
- カテゴリ: ${categoryLabel}
- 難易度: ${difficultyLabel}
${grammarLine}
- 件数: ${params.count}

## 作成ガイドライン
- 日本語文は1〜2文の自然な口語または書き言葉にする
- 英文は日本語の意味を最も自然に表現する標準的な英訳1つにする（過度に技巧的にしない）
- 難易度に応じて語彙・文型の複雑さを調整する
  - 1: 中学初級レベル
  - 2: 中学卒業レベル
  - 3: 高校初級レベル
  - 4: 高校卒業〜大学初級レベル
  - 5: 上級・ビジネス実務レベル
- notes には学習者が躓きやすい文法・語彙のポイントを1〜2文で簡潔に
- tags には文法カテゴリや表現タイプを2〜3個（例: "現在完了", "助動詞", "受動態"）
- カテゴリのテーマに沿った状況・語彙を使う${existingList}

## 出力形式
JSON のみで返してください。説明文・マークダウンは不要です。`;
};

export const generateProblems = async (
  params: GenerateParams,
): Promise<Problem[]> => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.9,
    },
  });

  const prompt = buildPrompt(params);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed: { items: GeneratedItem[] };
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini レスポンスの JSON パースに失敗しました: ${err}`);
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const now = new Date().toISOString();

  return items
    .filter((it) => it.japanese?.trim() && it.english?.trim())
    .map((it, idx) => ({
      id: `gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      japanese: it.japanese.trim(),
      english: it.english.trim(),
      category: params.category,
      difficulty: params.difficulty,
      grammar: params.grammar,
      notes: it.notes?.trim(),
      tags: it.tags?.filter((t) => typeof t === "string" && t.trim()),
      createdAt: now,
    }));
};
