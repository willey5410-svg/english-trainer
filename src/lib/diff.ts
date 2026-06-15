export type DiffSegment = {
  type: "match" | "user-only" | "answer-only";
  userText?: string;
  answerText?: string;
};

const tokenize = (text: string): string[] => {
  return text
    .trim()
    .split(/(\s+|[.,!?;:"'])/)
    .filter((t) => t.length > 0 && !/^\s+$/.test(t));
};

const normalize = (token: string, strict: boolean): string => {
  if (strict) return token;
  return token.toLowerCase().replace(/[.,!?;:"']/g, "");
};

export const computeDiff = (
  userInput: string,
  correctAnswer: string,
  strict = false,
): DiffSegment[] => {
  const userTokens = tokenize(userInput);
  const answerTokens = tokenize(correctAnswer);

  const m = userTokens.length;
  const n = answerTokens.length;

  // LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normalize(userTokens[i - 1], strict) === normalize(answerTokens[j - 1], strict)) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const segments: DiffSegment[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (normalize(userTokens[i - 1], strict) === normalize(answerTokens[j - 1], strict)) {
      segments.unshift({
        type: "match",
        userText: userTokens[i - 1],
        answerText: answerTokens[j - 1],
      });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      segments.unshift({
        type: "user-only",
        userText: userTokens[i - 1],
      });
      i--;
    } else {
      segments.unshift({
        type: "answer-only",
        answerText: answerTokens[j - 1],
      });
      j--;
    }
  }

  while (i > 0) {
    segments.unshift({
      type: "user-only",
      userText: userTokens[i - 1],
    });
    i--;
  }

  while (j > 0) {
    segments.unshift({
      type: "answer-only",
      answerText: answerTokens[j - 1],
    });
    j--;
  }

  return segments;
};

export const isExactMatch = (
  userInput: string,
  correctAnswer: string,
  strict = false,
): boolean => {
  const userTokens = tokenize(userInput).map((t) => normalize(t, strict));
  const answerTokens = tokenize(correctAnswer).map((t) => normalize(t, strict));
  if (userTokens.length !== answerTokens.length) return false;
  return userTokens.every((t, idx) => t === answerTokens[idx]);
};
