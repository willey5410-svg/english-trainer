// AI 機能（英訳・採点）のアクセス制御。
// サーバー側: 環境変数 APP_ACCESS_CODE が設定されていれば、リクエストヘッダの
//   x-access-code と一致した場合のみ許可する（ローカル/公開を問わず）。
//   未設定なら従来どおり「ローカルのみ許可」にフォールバックする。
// クライアント側: アクセスコードを localStorage に保持し、AI 系 API への POST に付与する。

const ACCESS_KEY = "english-trainer:access-code";

export type AccessCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

export const checkAiAccess = (request: Request): AccessCheck => {
  const code = process.env.APP_ACCESS_CODE;
  if (code) {
    const provided = request.headers.get("x-access-code") ?? "";
    if (provided !== code) {
      return {
        ok: false,
        status: 401,
        error: "アクセスコードが正しくありません",
      };
    }
    return { ok: true };
  }
  // コード未設定: 公開環境では無効、ローカルのみ許可。
  if (process.env.VERCEL) {
    return {
      ok: false,
      status: 403,
      error: "この環境ではAI機能は無効です（アクセスコード未設定）",
    };
  }
  return { ok: true };
};

export const getAccessCode = (): string => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_KEY) ?? "";
};

export const setAccessCode = (code: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, code);
};

export const clearAccessCode = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
};

// AI 系 API への POST。保存済みのアクセスコードをヘッダに付与して送信する。
// 401（コード未設定・不一致）が返った場合は呼び出し側で入力フォームを表示する。
// （window.prompt はモバイルで利用できないことがあるため使わない）
export const aiPost = async (url: string, body: unknown): Promise<Response> =>
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-code": getAccessCode(),
    },
    body: JSON.stringify(body),
  });
