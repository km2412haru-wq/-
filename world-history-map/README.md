# 🗺️ 世界史マップ

世界地図から国をタップ（または国名検索）すると、専用ページに遷移し、その国の歴史を**原始・古代 → 中世 → 近代・現代**の時代別にまとめて表示するWebアプリです。

## できること

- 世界地図（SVG）上の国をタップ、または検索ボックスで国名を入力して選択 → `/country/{国名}` ページに遷移
- **国旗・首都・人口** を表示（[REST Countries](https://restcountries.com/) の公開データ + [flagcdn.com](https://flagcdn.com/) の国旗画像）
- 選んだ国について、まず「{国名}の歴史」という専門記事をWikipediaで検索し、見つかればその全文を取得
- 記事内の見出し（`== 古代 ==` など）をキーワードマッチで **🏺 原始・古代 / 🏰 中世 / 🏙️ 近代・現代 / 📜 その他の時代** の4グループに自動分類して表示（同じ時代の見出しはまとめて表示）
- さらに **🧑‍🤝‍🧑 民族史 / 🍽️ 食に関する歴史 / 🏭 産業史** を、それぞれ関連するWikipedia記事（「{国名}の民族」「{国名}料理」「{国名}の経済」など）から要約表示
- 専門記事が見つからない場合は、国の概要記事にフォールバック（その旨を案内バナーで明示）
- 各セクションから元のWikipedia記事にジャンプ可能
- PWA対応でスマホのホーム画面にアイコンとして追加可能

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- 地図: [`world-atlas`](https://www.npmjs.com/package/world-atlas)（[Natural Earth](https://www.naturalearthdata.com/)データ、パブリックドメイン）+ [`d3-geo`](https://www.npmjs.com/package/d3-geo) + [`topojson-client`](https://www.npmjs.com/package/topojson-client) + [`i18n-iso-countries`](https://www.npmjs.com/package/i18n-iso-countries) で、ビルド時にSVGパス・ISO国コード・日本語/英語国名を生成（`npm run gen-world-map`）
- 歴史情報: Wikipedia日本語版の公開API（MediaWiki検索API + 全文抽出API）をサーバー側から呼び出し、見出しをキーワードマッチで時代分類（`lib/wikipedia.ts`）
- 国の基本情報: [REST Countries API](https://restcountries.com/)（首都・人口）+ [flagcdn.com](https://flagcdn.com/)（国旗SVG、ISO alpha-2コードから直接構築）（`lib/countryInfo.ts`）
- 外部APIキー・DB不要（すべて無料・キー不要の公開API/データ）

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

`lib/wikipedia.ts` の記事検索・フォールバック・キャッシュロジック、見出しの時代分類（`classifyEra`）、記事本文のセクション分割（`parseSections`）、時代ごとのグルーピング（`groupIntoEras`）、トピック別記事の検索（`fetchTopicSummary`）、`lib/countryInfo.ts` の人口フォーマット（`formatPopulationJa`）とREST Countries呼び出しを、ローカルに立てたHTTPサーバー上のフィクスチャ・ユニットテストで検証しています（外部ネットワーク不要、29件）。

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

- 「{国名}の歴史」記事のタイトルの付け方は国によって表記ゆれがあるため（例:「フランスの歴史」はそのまま存在するが、「中国の歴史」は「中華人民共和国の歴史」ではない、など）、まずWikipediaの検索APIで該当記事を探してから全文を取得する方式にしています。見つからない場合は国の概要記事（歴史以外の情報も含む）にフォールバックします。
- **時代分類はキーワードマッチによる簡易分類です。** LLMを使わず、見出し文字列に「古代」「中世」「近代」などが含まれるかで判定しているため、国によっては正確に分類できない場合があります（例: 日本史特有の時代区分「弥生時代」「鎌倉時代」等はサブ見出しとして直前の分類先にまとめて表示されます）。分類ロジックは `lib/wikipedia.ts` の `classifyEra` にあるので、精度を上げたい場合はキーワードを調整するか、LLM APIによる分類に置き換えてください。
- **民族史・食に関する歴史・産業史も同様にキーワードベースです。** 「{国名}の民族」「{国名}料理」のような固定パターンで検索しているため、記事が見つからない・関連性の低い記事がヒットする場合があります（`lib/wikipedia.ts` の `TOPIC_QUERIES`）。
- 係争地域・未承認国家（コソボ、北キプロス、ソマリランドなど）は国旗・首都・人口が取得できない場合があります（ISO国コードを持たないため）。
- 歴史情報・国の基本情報はいずれもサーバー側で24時間キャッシュしています。
- 開発サンドボックス環境ではネットワークポリシーによりWikipedia・REST Countries・flagcdn.comへの接続がブロックされることがあります。Vercelや通常のサーバー環境にデプロイすれば問題なく取得できます。

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
