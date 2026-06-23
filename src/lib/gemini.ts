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
// 採点はリクエスト数が多くなりがちなので、無料枠の日次上限が大きい flash-lite を既定にする。
const GRADE_MODEL = process.env.GEMINI_GRADE_MODEL ?? "gemini-2.5-flash-lite";

const getClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。.env.local を確認してください。",
    );
  }
  return new GoogleGenerativeAI(apiKey);
};

export class GeminiRateLimitError extends Error {
  constructor() {
    super("Gemini APIの利用回数が上限に達しました。1分ほど待って再試行してください。");
    this.name = "GeminiRateLimitError";
  }
}

const isRateLimitError = (err: unknown): boolean =>
  err instanceof Error &&
  ("status" in err && (err as { status?: number }).status === 429);

// 無料枠の分単位レート制限に短時間で達した場合、待って自動的に再試行する。
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 3000,
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (isRateLimitError(err) && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    if (isRateLimitError(err)) {
      throw new GeminiRateLimitError();
    }
    throw err;
  }
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
  - 1（中級）: 高校初級レベル
  - 2（上級）: 高校卒業〜大学初級レベル
  - 3（最上級）: 上級・ビジネス実務レベル
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

export type GradeParams = {
  japanese: string;
  reference: string;
  userAnswer: string;
};

export type GradeVerdict = "correct" | "close" | "incorrect";

export type GradeResult = {
  score: number;
  verdict: GradeVerdict;
  feedback: string;
  betterVersion?: string;
};

const gradeResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    score: { type: SchemaType.NUMBER },
    verdict: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["correct", "close", "incorrect"],
    },
    feedback: { type: SchemaType.STRING },
    betterVersion: { type: SchemaType.STRING },
  },
  required: ["score", "verdict", "feedback"],
};

const buildGradePrompt = (params: GradeParams): string => {
  return `あなたは英語学習者の「瞬間英作文」を採点する経験豊富な英語講師です。
学習者が日本語文を英訳しました。模範解答は1例にすぎないため、意味が正しく自然に伝わっていれば、模範解答と表現が違っても正解にしてください。

## 課題の日本語文
${params.japanese}

## 模範解答（あくまで一例）
${params.reference}

## 学習者の英訳
${params.userAnswer}

## 採点方針
- 日本語の意味が正確かつ自然に伝わっているかを最優先で評価する
- 文法・語法・スペル・時制・冠詞・前置詞などの誤りを減点要素とする
- 模範解答と単語が違うだけで意味が正しいものは減点しない
- score: 0〜100 の整数（100=完璧、70以上=実用上正解、40未満=意味が伝わらない）
- verdict: "correct"（実質正解）/ "close"（惜しい・軽微な誤り）/ "incorrect"（意味が伝わらない）
- feedback: 日本語で2〜4文。良い点と、直すべき点を具体的に指摘する
- betterVersion: 学習者の英訳をベースに自然に直した英文（既に完璧なら模範解答でよい）

## 出力形式
JSON のみで返してください。説明文・マークダウンは不要です。`;
};

export const gradeAnswer = async (
  params: GradeParams,
): Promise<GradeResult> => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: GRADE_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: gradeResponseSchema,
      temperature: 0.2,
    },
  });

  const result = await withRetry(() =>
    model.generateContent(buildGradePrompt(params)),
  );
  const text = result.response.text();

  let parsed: GradeResult;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini レスポンスの JSON パースに失敗しました: ${err}`);
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  const verdict: GradeVerdict =
    parsed.verdict === "correct" || parsed.verdict === "incorrect"
      ? parsed.verdict
      : "close";

  return {
    score,
    verdict,
    feedback: typeof parsed.feedback === "string" ? parsed.feedback.trim() : "",
    betterVersion:
      typeof parsed.betterVersion === "string" && parsed.betterVersion.trim()
        ? parsed.betterVersion.trim()
        : undefined,
  };
};

export type TranslateParams = {
  japanese: string;
  difficulty?: Difficulty;
};

export type TranslateResult = {
  english: string;
  notes?: string;
  tags?: string[];
};

const translateResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    english: { type: SchemaType.STRING },
    notes: { type: SchemaType.STRING },
    tags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["english"],
};

const buildTranslatePrompt = (params: TranslateParams): string => {
  const difficultyLine = params.difficulty
    ? `- 難易度の目安: ${DIFFICULTY_LABELS[params.difficulty]}（この水準の語彙・文型で）`
    : "- 難易度の目安: 自然で標準的な表現で";

  return `あなたは英語学習教材の作成者です。日本語話者向けの「瞬間英作文」用に、次の日本語文を自然な英語に翻訳してください。

## 日本語文
${params.japanese}

## 翻訳の方針
${difficultyLine}
- 日本語の意味を最も自然に表す標準的な英訳を1つだけ作る（過度に技巧的にしない）
- notes には学習者が躓きやすい文法・語彙のポイントを日本語で1〜2文、簡潔に
- tags には文法カテゴリや表現タイプを2〜3個（例: "現在完了", "助動詞", "受動態"）

## 出力形式
JSON のみで返してください。説明文・マークダウンは不要です。`;
};

export const translateToEnglish = async (
  params: TranslateParams,
): Promise<TranslateResult> => {
  const genAI = getClient();
  // 翻訳も採点と同様にリクエストが増えやすいので flash-lite を使う。
  const model = genAI.getGenerativeModel({
    model: GRADE_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: translateResponseSchema,
      temperature: 0.4,
    },
  });

  const result = await model.generateContent(buildTranslatePrompt(params));
  const text = result.response.text();

  let parsed: TranslateResult;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini レスポンスの JSON パースに失敗しました: ${err}`);
  }

  const english =
    typeof parsed.english === "string" ? parsed.english.trim() : "";
  if (!english) {
    throw new Error("英訳が生成されませんでした。再度お試しください。");
  }

  return {
    english,
    notes:
      typeof parsed.notes === "string" && parsed.notes.trim()
        ? parsed.notes.trim()
        : undefined,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t) => typeof t === "string" && t.trim())
      : undefined,
  };
};
