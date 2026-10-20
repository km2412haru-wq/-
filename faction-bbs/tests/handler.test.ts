import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryRepo, openBattle } from './memoryRepo'

// Lambda本番と同じ経路（環境変数 → createService → dispatch）を、DynamoDBだけ差し替えて通す
const mem = createMemoryRepo(openBattle({ startAt: 0, endAt: Date.now() + 3600_000 }))
vi.mock('../amplify/functions/api/dynamoRepo', () => ({ createDynamoRepo: () => mem.repo }))

let handler: (e: unknown) => Promise<string>
beforeAll(async () => {
  for (const k of ['TABLE_BATTLES', 'TABLE_POSTS', 'TABLE_EVENTS', 'TABLE_GUARDS']) process.env[k] = 't'
  process.env.HMAC_SECRET = 'secret'
  handler = (await import('../amplify/functions/api/handler')).handler as typeof handler
})

const call = async (e: unknown) => JSON.parse(await handler(e))

describe('handler', () => {
  it('Amplify Gen2 の平らなイベント形式(fieldName)を処理できる', async () => {
    const r = await call({ typeName: 'Query', fieldName: 'getCurrentBattle', arguments: {}, identity: null })
    expect(r.ok).toBe(true)
    expect(r.data.theme).toBe('リモートvs出社')
  })
  it('info.fieldName 形式も処理できる', async () => {
    const r = await call({ info: { fieldName: 'getCurrentBattle' }, arguments: {} })
    expect(r.ok).toBe(true)
  })
  it('ゲストの観客票、ユーザーの参戦と書き込み', async () => {
    const dev = 'device-0123456789abcdef'
    expect((await call({ fieldName: 'castSpectatorVote', arguments: { deviceId: dev, side: 'A' }, identity: null })).ok).toBe(true)
    const user = { sub: 'user-1' }
    expect((await call({ fieldName: 'joinBattle', arguments: { side: 'B' }, identity: user })).ok).toBe(true)
    const p = await call({ fieldName: 'createPost', arguments: { side: 'B', body: 'こんにちは' }, identity: user })
    expect(p.data.postNo).toBe(1)
    const l = await call({ fieldName: 'listPosts', arguments: { side: 'B' }, identity: null })
    expect(l.data.posts).toHaveLength(1)
  })
  it('ゲストの書き込みは UNAUTHORIZED', async () => {
    const r = await call({ fieldName: 'createPost', arguments: { side: 'A', body: 'x' }, identity: null })
    expect(r).toMatchObject({ ok: false, code: 'UNAUTHORIZED' })
  })
  it('未知の操作は INVALID_INPUT', async () => {
    expect(await call({ fieldName: 'nope', arguments: {} })).toMatchObject({ ok: false, code: 'INVALID_INPUT' })
  })
})
