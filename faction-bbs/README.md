# 派閥決戦BBS（MVP）

週1回・3日間の「派閥対抗・時限決戦型BBS」。設計は [`PLAN.md`](./PLAN.md)、要件の確認は [`REQUIREMENTS_CHECK.md`](./REQUIREMENTS_CHECK.md)、決定事項は [`DECISIONS.md`](./DECISIONS.md)。

> このリポジトリの他のアプリとは独立しています（依存・デプロイとも別）。コマンドは **この `faction-bbs/` の中で** 実行してください。

## 実装状況（計画の1週目）

| 状態 | 内容 |
|---|---|
| ✅ | 設定ファイル `shared/gameConfig.ts`（重み・閾値・最低成立人数・制限値） |
| ✅ | 文字数(300字・書記素単位)・URL禁止・NGワード・改行制限 `shared/textRules.ts` |
| ✅ | フェーズ判定・圧縮モード `shared/phase.ts` |
| ✅ | 観客票（端末ハッシュ、最新1票）/ 参戦（陣営固定）/ 書き込み（陣営スレ・通し番号・連投制限）/ 一覧 |
| ✅ | 参戦時に同端末の観客票を取消す（二重計上防止、イベントは残す） |
| ✅ | Events へのイベント追記（JOIN / SPECTATOR_VOTE / REVOKE / POST_CREATED） |
| ✅ | React UI（観客投票・参戦・陣営別スレ・投稿フォーム・ログイン） |
| ⏳ | 鞍替え・通報・折りたたみ・集計Lambda・AI指令・代表レス（2週目） |
| ⏳ | 判定・OGP（3週目）/ 異議・計測（4週目） |

**未検証:** DynamoDB実装(`amplify/functions/api/dynamoRepo.ts`)とCDK定義(`amplify/backend.ts`)はAWSに未デプロイです。型チェック・Lambdaのバンドル・メモリ実装での単体テストまでは通っています。最初の `ampx sandbox` で調整が入る可能性があります。

## 開発

```bash
npm install
npm test                 # 単体テスト（共有ロジック＋サービス層）
npm run typecheck

# バックエンドなしでUIだけ確認（状態はlocalStorage）
VITE_MOCK=1 npm run dev

# AWSに接続して動かす
npx ampx sandbox secret set HMAC_SECRET   # 端末ID・匿名IDのHMAC鍵（適当な長い文字列）
npx ampx sandbox                          # amplify_outputs.json を生成
npm run dev
```

### 戦を作る（週次の自動生成は2週目で置き換え）

```bash
# テーブル名は amplify_outputs.json の custom.tables.battles
TABLE_BATTLES=<テーブル名> npx tsx scripts/createBattle.ts \
  --theme "リモート vs 出社" --a "リモート派" --b "出社派" --day-hours 0.5   # 3日を1.5時間に圧縮
```

## 構成

```
shared/                  設定・型・文字ルール・フェーズ（フロントとLambdaで共用）
amplify/
  auth/                  Cognito（メール+パスワード）
  data/                  API定義（すべて api Lambda 経由、返り値は {ok,data|code} のJSON）
  functions/api/
    service.ts           ルール本体（Repoインターフェースにのみ依存）
    dynamoRepo.ts        DynamoDB実装（一意制約は条件付き書き込み+トランザクション）
    handler.ts           AppSyncリゾルバ
  backend.ts             テーブル(CDK): Battles / Posts(+bySide GSI) / Events(Streams有効) / Guards(TTL)
src/                     React UI（amplifyApi.ts=本番 / mockApi.ts=画面確認用）
tests/                   Vitest（メモリ実装のRepoでDynamoDB無しにサービス層を検証）
scripts/createBattle.ts  戦の作成
```
