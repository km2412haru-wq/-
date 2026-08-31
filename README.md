# このリポジトリについて

このリポジトリは、**それぞれ独立した4つのアプリ**を1つのGitHubリポジトリにまとめたモノレポです。共有コードは一切なく、依存パッケージもデプロイも完全に別々です。

| アプリ | ディレクトリ | 内容 |
|---|---|---|
| 🗞️ **AI M&A Radar** | [`ai-ma-radar/`](./ai-ma-radar) | AI関連企業のM&A・ビジネスモデル・業績動向をRSSから自動収集するダッシュボード（Next.js） |
| 🗺️ **世界史マップ** | [`world-history-map/`](./world-history-map) | 世界地図から国を選ぶと、その国の歴史をWikipediaから要約表示するアプリ（Next.js） |
| 📘 **AWS認定 学習ツール** | [`aws-saa-study/`](./aws-saa-study) | AWS認定資格（SAA-C03 / CLF-C02）対策の個人学習アプリ（React + Vite、データはlocalStorageに保存） |
| ⏱️ **AWS資格 模擬試験アプリ** | [`aws-exam-mock/`](./aws-exam-mock) | 資格・難易度レベルを選んで受験する10分間のミニ模擬試験アプリ。予想本番スコアを表示（React + Vite、サーバー・永続化なし） |

各アプリの詳しい説明・セットアップ手順は、それぞれのディレクトリ内の README を参照してください。

## Vercelで公開する

同じGitHubリポジトリから、**アプリの数だけVercelのプロジェクトを作る**ことで、それぞれ別のURLとして公開できます（新しいGitHubリポジトリを作る必要はありません）。

### 1つ目のプロジェクト（すでに公開済みなら不要）

1. Vercelで「Add New... → Project」→ このリポジトリを Import
2. **Root Directory** を `ai-ma-radar` に設定（Vercelのプロジェクト設定画面の「Root Directory」欄で変更できます。デフォルトはリポジトリのルートになっているので、必ず変更してください）
3. Deploy

### 2つ目のプロジェクト（世界史マップ用）

1. Vercelのダッシュボードで、もう一度「Add New... → Project」
2. **同じGitHubリポジトリ**を選んでImport（1つ目と同じリポジトリでOK。Vercelは1つのリポジトリから複数プロジェクトを作れます）
3. **Root Directory** を `world-history-map` に設定
4. Deploy

### 3つ目のプロジェクト（AWS SAA-C03学習ツール用）

1. Vercelのダッシュボードで、もう一度「Add New... → Project」
2. **同じGitHubリポジトリ**を選んでImport
3. **Root Directory** を `aws-saa-study` に設定（Vite製アプリなので、Framework Presetは自動的に「Vite」として検出されます）
4. Deploy

### 4つ目のプロジェクト（AWS資格 模擬試験アプリ用）

1. Vercelのダッシュボードで、もう一度「Add New... → Project」
2. **同じGitHubリポジトリ**を選んでImport
3. **Root Directory** を `aws-exam-mock` に設定（Vite製アプリなので、Framework Presetは自動的に「Vite」として検出されます）
4. Deploy

これで、それぞれ別々のURL（例: `ai-ma-radar-xxx.vercel.app`、`world-history-map-xxx.vercel.app`、`aws-saa-study-xxx.vercel.app`、`aws-exam-mock-xxx.vercel.app`）が発行されます。それぞれ独立してビルド・再デプロイされるので、1つのコードを変更しても他に影響することはありません。

なお、AWS認定 学習ツール（`aws-saa-study`）はデータをブラウザの`localStorage`にのみ保存する個人利用向けアプリ、AWS資格 模擬試験アプリ（`aws-exam-mock`）はデータを保存しない都度完結型のアプリのため、いずれも必ずしも公開デプロイが必要ではなく、`npm run dev`でローカルで使うだけでも問題ありません。

## なぜ完全に分離した構成にしたのか

最初は1つのNext.jsアプリの中に複数ページとして同居させていましたが、「別々のアプリとして、別URLで使いたい」というリクエストを受けて、この構成に変更しました。同じリポジトリ内に置いてはいますが、コード・依存パッケージ・ビルド・デプロイのすべてが独立しており、実質的に無関係な複数アプリです。
