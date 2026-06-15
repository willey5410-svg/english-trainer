# 瞬間英作文トレーナー

日本語文を見て瞬時に英訳するトレーニングを反復するための Web アプリです。
問題は Gemini API で自動生成し、タイピング照合と差分ハイライトで学習効果を高めます。

## できること（Phase 5 まで完了 = MVP完成）

- ランダムに日本語文を出題
- 英訳をタイピング入力 → 「解答を見る」で正解英文を表示
- ユーザー入力と正解の **単語単位の差分ハイライト**（誤り・欠落を色分け）
- 「できた / できなかった」で自己採点 → 進捗を localStorage に保存
- カテゴリ・難易度フィルタ
- **苦手 / 復習優先モード**: 不正解率・経過時間・未回答ボーナスを統合した SRS 的な複合スコアで重み付き抽選
- **Gemini API での問題自動生成**（カテゴリ・難易度・文型・件数を指定して一括生成）
- **学習統計画面**（全体・カテゴリ別・難易度別正答率、苦手問題トップ10、復習推奨リスト、最近の回答履歴）

## 優先度スコアの仕組み（苦手 / 復習優先モード）

```
score = 0.3 + incorrectRate × 1.5 + overdueRatio × 0.5 + untriedBonus

- incorrectRate : 不正解率（0〜1）
- overdueRatio  : 経過時間 ÷ 期待復習間隔（最大2.0でクランプ）
                  期待間隔 = baseInterval × 2^(正解数 − 不正解数)
                  baseInterval = 1時間、最大30日
- untriedBonus  : 未回答問題に +1.2（新しい問題への露出を確保）
```

このスコアで重み付き抽選するため、不正解が多い問題ほど・最後の回答から時間が経った問題ほど出題されやすくなります。

## セットアップ

### 1. Node.js をインストール

[nodejs.org](https://nodejs.org/) から LTS 版をインストールしてください。

### 2. 依存関係のインストール

```bash
cd /Users/kigoshiichirou/Desktop/english-trainer
npm install
```

### 3. Gemini API キーの設定（問題生成機能で必須）

1. [Google AI Studio](https://aistudio.google.com/apikey) で API キーを取得
2. `.env.example` をコピーして `.env.local` を作成

```bash
cp .env.example .env.local
```

3. `.env.local` に API キーを記入

```
GEMINI_API_KEY=あなたのAPIキー
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## ディレクトリ構成

```
english-trainer/
├── data/
│   └── problems.json            # 問題プール（Gemini で生成 / 初期はモック10問）
├── src/
│   ├── app/
│   │   ├── page.tsx             # メイン画面（トレーニング）
│   │   ├── stats/page.tsx       # 学習統計画面
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── generate/route.ts    # POST: Gemini で問題生成
│   │       └── problems/route.ts    # GET / DELETE: 問題プール管理
│   ├── components/
│   │   ├── TrainingApp.tsx      # アプリ全体の状態管理
│   │   ├── TrainingCard.tsx     # 問題カード（入力・解答表示）
│   │   ├── DiffView.tsx         # 差分ハイライト
│   │   ├── FilterBar.tsx        # カテゴリ・難易度フィルタ
│   │   ├── StatsBar.tsx         # セッション統計
│   │   ├── GenerateDialog.tsx   # 問題生成ダイアログ
│   │   └── StatsView.tsx        # 学習統計画面の本体
│   └── lib/
│       ├── types.ts             # 型定義
│       ├── diff.ts              # 単語単位 diff (LCS)
│       ├── storage.ts           # localStorage 操作
│       ├── problems.ts          # 問題 JSON の読み書き
│       ├── gemini.ts            # Gemini API クライアント
│       ├── statistics.ts        # 統計集計ロジック
│       └── scheduling.ts        # SRS的な優先度スコア / 重み付き抽選
├── .env.example
├── package.json
└── README.md
```

## 技術スタック

- Next.js 15 (App Router)
- TypeScript / Tailwind CSS
- Google Gemini API（Phase 3 で利用）
- localStorage（進捗保存）

## 使い方

### 問題の生成
1. 画面右上の「+ 問題を生成」ボタンを押す
2. カテゴリ・難易度・文法（任意）・件数を指定して「生成する」
3. Gemini が日英ペアを生成し、問題プールに追加される
4. 既存の問題と日本語文が重複するものは自動的に除外される

### トレーニング
1. 日本語文が表示されたら、頭の中で英訳を考える
2. 英訳をテキストエリアに入力（しなくてもOK）
3. 「解答を見る」（または Cmd/Ctrl + Enter）で正解を表示
4. 差分を確認し、「できた / できなかった」で自己採点
5. 「次の問題へ」で繰り返し

### 学習統計
- 画面右上の「学習統計 →」リンクから統計画面へ
- 全体の正答率、カテゴリ別・難易度別の正答率、苦手問題トップ10、復習推奨リスト、最近の回答履歴を確認できる
- 各回答履歴には次回の復習タイミング目安が表示される
- 「進捗をリセット」で localStorage の学習履歴をクリア可能（問題プール自体は保持される）
