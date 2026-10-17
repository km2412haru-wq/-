/**
 * 戦を1件作成して CURRENT に設定する運用スクリプト（週次のテーマ自動生成は2週目で置き換える）。
 *
 *   TABLE_BATTLES=<テーブル名> npx tsx scripts/createBattle.ts \
 *     --theme "リモートvs出社" --a "リモート派" --b "出社派" [--start 2026-01-05T12:00:00+09:00] [--day-hours 24] [--force]
 *
 * --day-hours 0.5 で3日間を1.5時間に圧縮できる（検証用）。
 */
import { parseArgs } from 'node:util'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import { gameConfig } from '../shared/gameConfig'
import { buildSchedule } from '../shared/phase'

const { values } = parseArgs({
  options: {
    theme: { type: 'string' },
    a: { type: 'string' },
    b: { type: 'string' },
    start: { type: 'string' },
    'day-hours': { type: 'string' },
    force: { type: 'boolean', default: false },
  },
})

const table = process.env.TABLE_BATTLES
if (!table) throw new Error('TABLE_BATTLES を指定してください')
if (!values.theme || !values.a || !values.b) throw new Error('--theme, --a, --b は必須です')

const startAt = values.start ? Date.parse(values.start) : Date.now()
if (Number.isNaN(startAt)) throw new Error('--start が不正です')
const dayHours = values['day-hours'] ? Number(values['day-hours']) : gameConfig.phase.dayHours
if (!(dayHours > 0)) throw new Error('--day-hours が不正です')
const s = buildSchedule(startAt, dayHours)

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const battleId = `${new Date(startAt).toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`

// 同時開催は1戦のみ: 受付中（締切前）の戦があれば --force なしでは作らない
const cur = await ddb.send(new GetCommand({ TableName: table, Key: { PK: 'CURRENT', SK: 'CURRENT' } }))
if (cur.Item?.battleId && !values.force) {
  const prev = await ddb.send(
    new GetCommand({ TableName: table, Key: { PK: `BATTLE#${cur.Item.battleId}`, SK: 'META' } }),
  )
  if (prev.Item && prev.Item.endAt > Date.now()) {
    throw new Error(`戦 ${cur.Item.battleId} が開催中/開催予定です（締切 ${new Date(prev.Item.endAt).toISOString()}）。--force で置き換え`)
  }
}

await ddb.send(
  new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: table,
          Item: {
            PK: `BATTLE#${battleId}`,
            SK: 'META',
            battleId,
            theme: values.theme,
            sideLabelA: values.a,
            sideLabelB: values.b,
            startAt: s.startAt,
            day2At: s.day2At,
            day3At: s.day3At,
            endAt: s.endAt,
            status: 'OPEN',
            mode: 'FULL',
            nextPostNo: 0,
            // 戦の途中で設定が変わっても結果が変わらないよう、開始時の設定を凍結する
            configSnapshot: gameConfig,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      { Put: { TableName: table, Item: { PK: 'CURRENT', SK: 'CURRENT', battleId } } },
    ],
  }),
)
console.log(JSON.stringify({ battleId, startAt: new Date(s.startAt).toISOString(), endAt: new Date(s.endAt).toISOString() }, null, 2))
