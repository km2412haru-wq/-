# このリポジトリについて

このリポジトリは、**それぞれ独立した3つのアプリ**を1つのGitHubリポジトリにまとめたモノレポです。共有コードは一切なく、依存パッケージもデプロイも完全に別々です。

| アプリ | ディレクトリ | 内容 |
|---|---|---|
| 🗞️ **AI M&A Radar** | [`ai-ma-radar/`](./ai-ma-radar) | AI関連企業のM&A・ビジネスモデル・業績動向をRSSから自動収集するダッシュボード（Next.js） |
| 🗺️ **世界史マップ** | [`world-history-map/`](./world-history-map) | 世界地図から国を選ぶと、その国の歴史をWikipediaから要約表示するアプリ（Next.js） |
| 📘 **AWS SAA-C03 学習ツール** | [`aws-saa-study/`](./aws-saa-study) | AWS認定ソリューションアーキテクト–アソシエイト試験対策の個人学習アプリ（React + Vite、データはlocalStorageに保存） |

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

これで、それぞれ別々のURL（例: `ai-ma-radar-xxx.vercel.app`、`world-history-map-xxx.vercel.app`、`aws-saa-study-xxx.vercel.app`）が発行されます。それぞれ独立してビルド・再デプロイされるので、1つのコードを変更しても他に影響することはありません。

なお、AWS SAA-C03学習ツールはデータをブラウザの`localStorage`にのみ保存する個人利用向けアプリのため、必ずしも公開デプロイが必要ではなく、`npm run dev`でローカルで使うだけでも問題ありません。

## なぜ完全に分離した構成にしたのか

最初は1つのNext.jsアプリの中に複数ページとして同居させていましたが、「別々のアプリとして、別URLで使いたい」というリクエストを受けて、この構成に変更しました。同じリポジトリ内に置いてはいますが、コード・依存パッケージ・ビルド・デプロイのすべてが独立しており、実質的に無関係な複数アプリです。
