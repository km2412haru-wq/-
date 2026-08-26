# AI M&A Radar

AI関連企業の **M&A（買収・合併）**・**ビジネスモデル**・**利益/業績動向** を、複数のRSSフィードから自動収集して一覧表示するWebダッシュボードです。

## できること

- TechCrunch, VentureBeat, MIT Technology Review, PR Newswire, ITmedia AI+, Ledge.ai, AINOW, AI-SCHOLAR など、AIに特化したニュースフィードを並行取得（日本語ソース・英語ソース両方）
- キーワードベースでニュースを `M&A` / `ビジネスモデル` / `利益・業績` / `その他` に自動タグ付け（1記事が複数タグを持つこともあります）
- 記事中に登場する企業名から `国内` / `海外` を自動判定（例: SoftBank→国内、OpenAI→海外。両方言及されていれば両方タグ付け）
- カテゴリタブ・国内/海外タブ・フリーワード検索・「日本語の記事のみ」トグルで絞り込み
- 「最新情報に更新」ボタンでオンデマンド再取得（通常はサーバー側で10分キャッシュ）
- 1つのフィードが取得失敗しても他のフィードの表示は継続し、失敗したソース名だけをバナーで表示
- PWA対応でスマホのホーム画面にアイコンとして追加可能

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- [`rss-parser`](https://www.npmjs.com/package/rss-parser) でRSS/Atomを取得・パース
- 外部APIキー・DB不要（すべて公開RSSフィードから取得）

## セットアップ

```bash
npm install
npm run dev
```

`http://localhost:3000` で確認できます。

## テスト

```bash
npm test
```

`categorize.ts`/`companyOrigin.ts` のキーワード分類ロジックと、`fetchNews.ts` の並行取得・重複排除・並び替え・エラーハンドリングを、ローカルに立てたHTTPサーバー上のサンプルRSSでテストしています（外部ネットワーク不要、17件）。

## ビルド

```bash
npm run build
npm start
```

## 情報源を追加・変更する

`lib/feeds.ts` にRSS URLを追加するだけです。フィードごとに独立して取得されるため、1件追加しても既存フィードには影響しません。

```ts
{
  name: "表示名",
  url: "https://example.com/feed/",
  lang: "ja", // or "en"
}
```

AIに特化していない一般的なフィード（企業の全社ニュースリリースなど）を追加する場合は、`lib/categorize.ts` の `isAiRelevant()` を使ってAI関連記事だけに絞り込むことを推奨します（現状の全フィードはAI専門メディアのため未適用）。

## 分類ロジックについて

`lib/categorize.ts`（M&A/ビジネスモデル/利益・業績）と `lib/companyOrigin.ts`（国内/海外）は、どちらも外部LLM/API不要のキーワードマッチによる簡易分類です。英語は単語境界(`\b`)でのマッチ、日本語は部分一致でマッチしています。精度を上げたい場合は、これらのモジュールを差し替えて分類にLLM APIを呼ぶ実装に置き換えることができます（Anthropic Claude APIなど）。

国内/海外の判定は「記事に登場する企業名」ベースです。`lib/companyOrigin.ts` の `COMPANIES` に会社名を追加すれば判定対象を増やせます。

## 英語記事を日本語にしたい場合

現在の実装では英語記事の自動翻訳はしていません（翻訳APIのアカウント登録が必要になるため）。代わりに、「日本語の記事のみ」トグルで日本語ソース（ITmedia AI+, Ledge.ai, AINOW, AI-SCHOLAR）だけに絞り込めます。将来的に自動翻訳を追加したい場合は、DeepL APIやAnthropic Claude APIなどを `lib/fetchNews.ts` に組み込む形で拡張できます（APIキーの発行・環境変数設定が別途必要です）。

## 既知の制限

- **通知機能は未実装**です。現状はダッシュボードを開いて確認する形（プル型）です。メール/Slack通知を追加する場合は、`lib/fetchNews.ts` の `getNews()` を定期実行するcronジョブ（Vercel Cron / GitHub Actions等）を用意し、新着かつ `ma`/`profit` タグの記事を検知したら通知APIを呼ぶ構成が拡張しやすいです。
- カテゴリ分類はキーワードベースの簡易ロジックのため、誤タグ・タグ漏れが発生することがあります。
- 開発サンドボックス環境ではネットワークポリシーにより外部ニュースサイトへの接続がブロックされることがあります。Vercelや通常のサーバー環境にデプロイすれば問題なく取得できます。

## デプロイ

このディレクトリを **Root Directory** に指定してVercelにデプロイしてください（リポジトリ全体の構成・複数プロジェクトの作り方はリポジトリ直下の[README](../README.md)を参照）。サーバーサイドでRSSを取得するため、フロントエンド専用の静的ホスティング（GitHub Pagesなど）では動作しません。

## スマホのホーム画面に置く（PWA対応）

このアプリはPWA（Progressive Web App）として構成済みです（`app/manifest.ts`、`app/icon.tsx`、`app/apple-icon.tsx`、`public/sw.js`）。**HTTPSで公開されたURL**であれば、以下の手順でホーム画面にアイコンとして追加できます。

1. Vercel等にデプロイして公開URL（`https://…`）を取得する
2. そのURLをスマホのブラウザで開く
   - **iOS (Safari)**: 共有ボタン（□に↑）→「ホーム画面に追加」
   - **Android (Chrome)**: 右上のメニュー（︙）→「アプリをインストール」または「ホーム画面に追加」（自動でインストールバナーが出ることもあります）
3. ホーム画面のアイコンをタップすると、アドレスバーなしのアプリらしい見た目（standalone表示）で起動します

アイコンのデザインを変更したい場合は `app/icon.tsx` / `app/apple-icon.tsx`（ブラウザタブ・iOSアイコン用、コードでデザイン）を編集するか、`npm run gen-icons` で `public/icons/` 配下のPWAマニフェスト用アイコン（192px/512px、通常＋Android maskable）を再生成してください。
