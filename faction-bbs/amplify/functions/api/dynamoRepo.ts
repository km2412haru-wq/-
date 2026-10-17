import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { BattleMeta, PostItem, Side } from '../../../shared/types'
import { RepoError, type DeviceVoteRecord, type MemberRecord, type Repo } from './repo'

export interface Tables {
  battles: string
  posts: string
  events: string
  guards: string
}

const bpk = (id: string) => `BATTLE#${id}`
const postSk = (no: number) => `POST#${String(no).padStart(6, '0')}`
const eventSk = (now: number) => `${new Date(now).toISOString()}#${randomUUID()}`
const DAY_SEC = 24 * 60 * 60

const isConditionalFailure = (e: unknown) =>
  (e as { name?: string })?.name === 'ConditionalCheckFailedException'
const isTxCanceled = (e: unknown) => (e as { name?: string })?.name === 'TransactionCanceledException'

export function createDynamoRepo(t: Tables, client?: DynamoDBDocumentClient): Repo {
  const ddb =
    client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } })

  return {
    async getCurrentBattle() {
      const cur = await ddb.send(new GetCommand({ TableName: t.battles, Key: { PK: 'CURRENT', SK: 'CURRENT' } }))
      const id = cur.Item?.battleId as string | undefined
      if (!id) return null
      const meta = await ddb.send(new GetCommand({ TableName: t.battles, Key: { PK: bpk(id), SK: 'META' } }))
      const m = meta.Item
      if (!m) return null
      return {
        battleId: id,
        theme: m.theme,
        sideLabels: { A: m.sideLabelA, B: m.sideLabelB },
        startAt: m.startAt,
        endAt: m.endAt,
        status: m.status,
        mode: m.mode,
      } satisfies BattleMeta
    },

    async getMember(battleId, userId): Promise<MemberRecord | null> {
      const r = await ddb.send(
        new GetCommand({ TableName: t.guards, Key: { PK: bpk(battleId), SK: `MEMBER#${userId}` } }),
      )
      return r.Item ? { side: r.Item.side, switched: !!r.Item.switched } : null
    },

    async getDeviceVote(battleId, deviceHash): Promise<DeviceVoteRecord | null> {
      const r = await ddb.send(
        new GetCommand({ TableName: t.guards, Key: { PK: bpk(battleId), SK: `DEVICE#${deviceHash}` } }),
      )
      return r.Item ? { side: r.Item.side, revoked: !!r.Item.revoked } : null
    },

    async joinBattle({ battleId, userId, side, now, deviceHash }) {
      try {
        await ddb.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: t.guards,
                  Item: { PK: bpk(battleId), SK: `MEMBER#${userId}`, side, switched: false, joinedAt: now },
                  ConditionExpression: 'attribute_not_exists(PK)',
                },
              },
              {
                Put: {
                  TableName: t.events,
                  Item: {
                    PK: bpk(battleId),
                    SK: eventSk(now),
                    type: 'JOIN',
                    actorId: userId,
                    actorTrust: 'L1',
                    payload: { side },
                    createdAt: now,
                  },
                },
              },
            ],
          }),
        )
      } catch (e) {
        if (isTxCanceled(e)) throw new RepoError('ALREADY_MEMBER')
        throw e
      }

      if (!deviceHash) return
      // Q-05: 参戦した端末の観客票は二重計上を避けるため取り消す（イベントは残す）
      const key = { PK: bpk(battleId), SK: `DEVICE#${deviceHash}` }
      const dev = await ddb.send(new GetCommand({ TableName: t.guards, Key: key }))
      if (!dev.Item || dev.Item.revoked) return
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: t.guards,
                Key: key,
                UpdateExpression: 'SET revoked = :t',
                ConditionExpression: 'attribute_exists(PK) AND revoked = :f',
                ExpressionAttributeValues: { ':t': true, ':f': false },
              },
            },
            {
              Put: {
                TableName: t.events,
                Item: {
                  PK: bpk(battleId),
                  SK: eventSk(now),
                  type: 'REVOKE',
                  actorId: userId,
                  payload: { target: 'SPECTATOR_VOTE', side: dev.Item.side, reason: 'JOINED_AS_MEMBER' },
                  createdAt: now,
                },
              },
            },
          ],
        }),
      ).catch((e) => {
        // 並行して取消し済みなら何もしない
        if (!isTxCanceled(e)) throw e
      })
    },

    async upsertDeviceVote({ battleId, deviceHash, side, prevSide, weight, now }) {
      try {
        await ddb.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: t.guards,
                  Item: { PK: bpk(battleId), SK: `DEVICE#${deviceHash}`, side, weight, revoked: false, updatedAt: now },
                  ...(prevSide
                    ? {
                        ConditionExpression: 'side = :prev AND revoked = :f',
                        ExpressionAttributeValues: { ':prev': prevSide, ':f': false },
                      }
                    : { ConditionExpression: 'attribute_not_exists(PK)' }),
                },
              },
              {
                Put: {
                  TableName: t.events,
                  Item: {
                    PK: bpk(battleId),
                    SK: eventSk(now),
                    type: 'SPECTATOR_VOTE',
                    actorId: deviceHash,
                    actorTrust: 'L0',
                    weight,
                    payload: { side, prevSide },
                    createdAt: now,
                  },
                },
              },
            ],
          }),
        )
      } catch (e) {
        if (isTxCanceled(e)) throw new RepoError('CONFLICT')
        throw e
      }
    },

    async touchPostRate({ battleId, userId, now, cooldownSec, dailyMax, dateKey }) {
      try {
        await ddb.send(
          new UpdateCommand({
            TableName: t.guards,
            Key: { PK: bpk(battleId), SK: `COOL#${userId}` },
            UpdateExpression: 'SET lastPostAt = :now, #ttl = :ttl',
            ConditionExpression: 'attribute_not_exists(lastPostAt) OR lastPostAt <= :cut',
            ExpressionAttributeNames: { '#ttl': 'ttl' },
            ExpressionAttributeValues: {
              ':now': now,
              ':cut': now - cooldownSec * 1000,
              ':ttl': Math.floor(now / 1000) + DAY_SEC,
            },
          }),
        )
        await ddb.send(
          new UpdateCommand({
            TableName: t.guards,
            Key: { PK: bpk(battleId), SK: `DAILY#${userId}#${dateKey}` },
            UpdateExpression: 'ADD n :one SET #ttl = :ttl',
            ConditionExpression: 'attribute_not_exists(n) OR n < :max',
            ExpressionAttributeNames: { '#ttl': 'ttl' },
            ExpressionAttributeValues: { ':one': 1, ':max': dailyMax, ':ttl': Math.floor(now / 1000) + 3 * DAY_SEC },
          }),
        )
      } catch (e) {
        if (isConditionalFailure(e)) throw new RepoError('RATE_LIMIT')
        throw e
      }
    },

    async createPost({ battleId, userId, authorAlias, side, body, now }) {
      const counter = await ddb.send(
        new UpdateCommand({
          TableName: t.battles,
          Key: { PK: bpk(battleId), SK: 'META' },
          UpdateExpression: 'ADD nextPostNo :one',
          ExpressionAttributeValues: { ':one': 1 },
          ReturnValues: 'UPDATED_NEW',
        }),
      )
      const postNo = counter.Attributes?.nextPostNo as number
      const post: PostItem = { postNo, side, authorAlias, kind: 'USER', body, createdAt: now }
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: t.posts,
                Item: {
                  PK: bpk(battleId),
                  SK: postSk(postNo),
                  GSI1PK: `${bpk(battleId)}#SIDE#${side}`,
                  GSI1SK: postSk(postNo),
                  ...post,
                  authorId: userId,
                },
                ConditionExpression: 'attribute_not_exists(PK)',
              },
            },
            {
              Put: {
                TableName: t.events,
                Item: {
                  PK: bpk(battleId),
                  SK: eventSk(now),
                  type: 'POST_CREATED',
                  actorId: userId,
                  actorTrust: 'L1',
                  payload: { postNo, side },
                  createdAt: now,
                },
              },
            },
          ],
        }),
      )
      return post
    },

    async listPosts({ battleId, side, afterPostNo, limit }) {
      const r = await ddb.send(
        new QueryCommand({
          TableName: t.posts,
          IndexName: 'bySide',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :after',
          ExpressionAttributeValues: { ':pk': `${bpk(battleId)}#SIDE#${side}`, ':after': postSk(afterPostNo) },
          Limit: limit,
          ScanIndexForward: true,
        }),
      )
      return (r.Items ?? []).map((i) => ({
        postNo: i.postNo,
        side: i.side,
        authorAlias: i.authorAlias,
        kind: i.kind,
        body: i.body,
        createdAt: i.createdAt,
      }))
    },
  }
}
