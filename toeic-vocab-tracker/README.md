# 知らない単語記録アプリ(TOEIC学習用)

TOEIC学習中に出会った「知らない単語」を記録するアプリです。ノートへの手書き記録だとバラバラになってしまう情報を、スマホでいつでも見返せる形にまとめます。

単語を登録すると、**AI(Claude API)がその単語の派生語(名詞形・動詞形・形容詞形・副詞形など)を自動で提案**します。提案は一覧表示され、個別に「登録する/却下する」を選べます(全部が自動登録されるわけではありません)。派生語同士は「単語グループ」として紐付けられ、グループ表示で元の単語から派生語を辿れます。

## 主な機能

- **単語登録**: 単語(英語)・意味(日本語)・品詞を入力して登録。登録日時は自動記録、「覚えた/未定着」のチェック状態を持つ
- **熟語・慣用句の登録**: 登録フォームで「単語/熟語・慣用句」を切り替え可能。熟語・慣用句は品詞を持たず、派生語提案の対象にもならない、単語とは別枠のエントリとして管理される
- **派生語の自動提案**: 単語登録時にClaudeが派生語候補を提案。ユーザーは候補ごとに意味・品詞を編集した上で、個別に採用/却下できる(熟語・慣用句では提案されない)
- **例文の自動生成**: 単語・熟語のカードから「📝 例文を生成」でClaudeがTOEICのビジネスシーンを想定した英語例文+日本語訳を作成。再生成・手動編集も可能
- **一覧・検索**: カード形式の一覧表示(品詞ごとに色分け、熟語は専用の配色)、単語名での検索、並び替え(登録日順/アルファベット順)、覚えた/未定着・単語/熟語での絞り込み
- **グループ表示**: 元の単語とその派生語をグループ単位でまとめて表示する切り替えビュー
- **データ永続化**: 単語データはブラウザの`localStorage`にのみ保存(サーバー/DBなし)。オフラインでも一覧の閲覧・チェック操作が可能。派生語の自動提案・例文生成にはネット接続が必要

## セットアップ

```bash
npm install
cp .env.local.example .env.local
# .env.local に ANTHROPIC_API_KEY を設定(https://console.anthropic.com/settings/keys で発行)
npm run dev
```

`http://localhost:3000` で確認できます。

APIキーが未設定でも、単語の登録・一覧・検索・チェック操作(すべてlocalStorageベース)はそのまま使えます。派生語の自動提案機能を使う場合のみAPIキーが必要です。

## 技術スタック

- Next.js (App Router) + TypeScript
- [Anthropic Claude API](https://docs.anthropic.com/)(`@anthropic-ai/sdk`。tool useで派生語候補・例文をJSON形式に固定して取得)
- データ永続化はDBを使わず、ブラウザの`localStorage`にJSON形式で保存
- スタイリングはプレーンCSS(フレームワーク未使用)。レスポンシブ対応、ライト/ダークモード対応

## ディレクトリ構成

```
app/
  page.tsx                        メイン画面(登録フォーム・提案パネル・一覧/グループ表示)
  layout.tsx / globals.css        レイアウトとスタイル
  api/suggest-derivatives/        派生語提案のAPI Route(Claude呼び出し。APIキーはサーバー側のみで使用)
  api/generate-example/           例文生成のAPI Route(同上)
components/
  WordForm.tsx                     単語登録フォーム
  WordCard.tsx / WordList.tsx      カード表示・一覧
  GroupList.tsx                    単語グループ表示
  SuggestionsPanel.tsx             AI派生語提案の採否・編集UI
  Controls.tsx / PosBadge.tsx      検索・並び替え・絞り込み、品詞バッジ
lib/
  anthropic.ts                     Claude APIクライアント(tool useで構造化出力)
  promptBuilder.ts                 プロンプト組み立て
  useWords.ts / storage.ts         localStorageへのCRUD・永続化
  partOfSpeech.ts / id.ts          品詞の表示・配色、ID発行
types/word.ts                      型定義
```

## 派生語提案の仕組み

1. 単語登録(または一覧の「🤖 派生語を提案」ボタン)をトリガーに、サーバー側のAPI Route (`/api/suggest-derivatives`) がClaudeを呼び出す
2. プロンプトでは、登録済みの単語(同グループ内)を除外するよう指示し、重複提案を防ぐ
3. Claudeの応答はtool use(関数呼び出し形式)で `{ word, partOfSpeech, meaning }` の配列に固定して取得するため、パース失敗のリスクを抑えている
4. 提案は画面上で個別に意味・品詞を編集でき、「登録する」を押したものだけが同じグループIDで単語データに追加される

## 今後の拡張候補

- 単語グループ全体の学習進捗(グループ内で何語覚えたか)の可視化
- 単語データのエクスポート/インポート(端末間の引き継ぎ)
