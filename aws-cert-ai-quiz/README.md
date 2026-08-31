# AWS認定AI作問クイズ

AWS認定資格(**Cloud Practitioner** / **Solutions Architect Associate**)対策の学習ツールです。

固定の問題セットを解くのではなく、**AIがAWS公式試験ガイド(出題ドメイン・出題比率)に基づいてその都度オリジナルの4択問題を生成**します。問題は市販/公式問題集の複製ではなく、指定したドメイン・トピックをもとにゼロから作問させます。

> **現在の実装状況(Step1)**: 資格を選んで1問生成→回答→解説表示、という最小限の動線のみ実装済みです。苦手分野トラッキング・出題の重複防止・ドメイン別演習などは未実装です(段階的に追加予定)。

## セットアップ

```bash
npm install
cp .env.local.example .env.local
# .env.local に GEMINI_API_KEY を設定(https://aistudio.google.com/apikey で無料発行)
npm run dev
```

`http://localhost:3000` で確認できます。`/quiz` がクイズ画面です。

## 技術スタック

- Next.js (App Router) + TypeScript
- [Google Gemini API](https://ai.google.dev/)(`@google/genai`、無料枠を利用。モデルは既定で `gemini-2.5-flash`)
- データ永続化はDBを使わず、ブラウザの `localStorage` にJSON形式で保存する方針(進捗・苦手分野トラッキング・出題履歴は今後のステップで実装)

## ディレクトリ構成

```
app/
  page.tsx                  トップページ
  quiz/page.tsx              クイズ画面(出題〜解答〜解説)
  api/generate-question/     Gemini呼び出しAPI Route(APIキーはサーバー側のみで使用)
data/examGuides/             CP/SAAの出題ドメイン・出題比率・代表トピック
lib/
  gemini.ts                  Gemini APIクライアント(構造化出力でJSONを取得)
  promptBuilder.ts            プロンプト組み立て
  domainPicker.ts             出題比率に応じた重み付きドメイン選択
  validateQuestion.ts          Gemini応答のバリデーション(Zod)
types/quiz.ts                 型定義
```

## 今後の実装予定

- 出題履歴のトピック指紋を記録し、生成プロンプトに埋め込むことで重複・類似問題を回避
- 解答結果(正誤・ドメイン)をlocalStorageに記録し、苦手ドメインの出題比率を自動的に上げる
- ドメイン別演習(特定分野だけ集中出題)
- 進捗・苦手分野の可視化画面
