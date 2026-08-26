# 🗺️ 世界史マップ

世界地図から国をタップ（または国名検索）すると、その国の歴史をWikipedia日本語版から要約表示するWebアプリです。

## できること

- 世界地図（SVG）上の国をタップして選択、または検索ボックスで国名を入力して選択
- 選んだ国について、まず「{国名}の歴史」という専門記事をWikipediaで検索し、見つかればその要約を表示
- 専門記事が見つからない場合は、国の概要記事にフォールバックして表示（その旨を案内バナーで明示）
- 「Wikipediaで続きを読む→」で元記事にジャンプ可能
- PWA対応でスマホのホーム画面にアイコンとして追加可能

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- 地図: [`world-atlas`](https://www.npmjs.com/package/world-atlas)（[Natural Earth](https://www.naturalearthdata.com/)データ、パブリックドメイン）+ [`d3-geo`](https://www.npmjs.com/package/d3-geo) + [`topojson-client`](https://www.npmjs.com/package/topojson-client) + [`i18n-iso-countries`](https://www.npmjs.com/package/i18n-iso-countries) で、ビルド時にSVGパス・ISO国コード・日本語/英語国名を生成（`npm run gen-world-map`）
- 歴史情報: Wikipedia日本語版の公開API（MediaWiki検索API + REST Summary API）をサーバー側から呼び出し
- 外部APIキー・DB不要

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

`lib/wikipedia.ts` の記事検索・フォールバック・キャッシュロジックを、ローカルに立てたHTTPサーバー上のフィクスチャでテストしています（外部ネットワーク不要、4件）。

## ビルド

```bash
npm run build
npm start
```

## 地図データを再生成する

`public/world-map.json` はビルド前に生成済みのファイルとしてリポジトリに含まれています。地図の解像度や投影法を変えたい場合は `scripts/gen-world-map.mjs` を編集し、以下を実行してください。

```bash
npm run gen-world-map
```

## 仕組み・既知の制限

- 「{国名}の歴史」記事のタイトルの付け方は国によって表記ゆれがあるため（例:「フランスの歴史」はそのまま存在するが、「中国の歴史」は「中華人民共和国の歴史」ではない、など）、まずWikipediaの検索APIで該当記事を探してから要約を取得する方式にしています。見つからない場合は国の概要記事（歴史以外の情報も含む）にフォールバックします。
- 係争地域・未承認国家（コソボ、北キプロス、ソマリランドなど）は簡易対応です（`scripts/gen-world-map.mjs` の `NAME_OVERRIDES` で個別に名前を設定）。
- 歴史情報はサーバー側で24時間キャッシュしています。
- 開発サンドボックス環境ではネットワークポリシーによりWikipediaへの接続がブロックされることがあります。Vercelや通常のサーバー環境にデプロイすれば問題なく取得できます。

## デプロイ

このディレクトリを **Root Directory** に指定してVercelにデプロイしてください（リポジトリ全体の構成・複数プロジェクトの作り方はリポジトリ直下の[README](../README.md)を参照）。歴史情報の取得をサーバー側で行うため、フロントエンド専用の静的ホスティング（GitHub Pagesなど）では動作しません。

## スマホのホーム画面に置く（PWA対応）

このアプリはPWA（Progressive Web App）として構成済みです。**HTTPSで公開されたURL**であれば、以下の手順でホーム画面にアイコンとして追加できます。

1. Vercel等にデプロイして公開URL（`https://…`）を取得する
2. そのURLをスマホのブラウザで開く
   - **iOS (Safari)**: 共有ボタン（□に↑）→「ホーム画面に追加」
   - **Android (Chrome)**: 右上のメニュー（︙）→「アプリをインストール」または「ホーム画面に追加」
3. ホーム画面のアイコン（青緑の「史」マーク）をタップすると、アドレスバーなしのアプリらしい見た目（standalone表示）で起動します

アイコンのデザインを変更したい場合は `app/icon.tsx` / `app/apple-icon.tsx` を編集するか、`npm run gen-icons` で `public/icons/` 配下のPWAマニフェスト用アイコンを再生成してください。
