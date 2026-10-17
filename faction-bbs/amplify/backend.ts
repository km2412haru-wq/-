import { defineBackend } from '@aws-amplify/backend'
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb'
import { RemovalPolicy } from 'aws-cdk-lib'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { api } from './functions/api/resource'

const backend = defineBackend({ auth, data, api })

// Amplify Data のモデルは使わず、設計書(PLAN.md)どおりのテーブルをCDKで直接定義する
const stack = backend.createStack('FactionBbsTables')

const common = {
  partitionKey: { name: 'PK', type: AttributeType.STRING },
  sortKey: { name: 'SK', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.RETAIN,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
}

const battles = new Table(stack, 'Battles', common)

const posts = new Table(stack, 'Posts', common)
posts.addGlobalSecondaryIndex({
  indexName: 'bySide',
  partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
  sortKey: { name: 'GSI1SK', type: AttributeType.STRING },
})

// 追記専用。2週目の集計Lambdaが Streams を購読する
const events = new Table(stack, 'Events', { ...common, stream: StreamViewType.NEW_IMAGE })

const guards = new Table(stack, 'Guards', { ...common, timeToLiveAttribute: 'ttl' })

const fn = backend.api.resources.lambda
for (const t of [battles, posts, events, guards]) t.grantReadWriteData(fn)
backend.api.addEnvironment('TABLE_BATTLES', battles.tableName)
backend.api.addEnvironment('TABLE_POSTS', posts.tableName)
backend.api.addEnvironment('TABLE_EVENTS', events.tableName)
backend.api.addEnvironment('TABLE_GUARDS', guards.tableName)

// 運用スクリプト(scripts/createBattle.ts)がテーブル名を引けるよう出力に載せる
backend.addOutput({
  custom: {
    tables: { battles: battles.tableName, posts: posts.tableName, events: events.tableName, guards: guards.tableName },
  },
})
