import { beforeEach, describe, expect, it } from 'vitest'
import { gameConfig } from '../shared/gameConfig'
import { ApiError, createService } from '../amplify/functions/api/service'
import { createMemoryRepo, openBattle } from './memoryRepo'

const DEV = 'device-0123456789abcdef'
let t = 10_000

function setup(battle = openBattle()) {
  const mem = createMemoryRepo(battle)
  const svc = createService({ repo: mem.repo, secret: 'test-secret', now: () => t })
  return { ...mem, svc }
}
const code = async (p: Promise<unknown>) => {
  try {
    await p
  } catch (e) {
    return e instanceof ApiError ? e.code : 'OTHER'
  }
  return 'NO_ERROR'
}

beforeEach(() => {
  t = 10_000
})

describe('観客票', () => {
  it('ワンタップで投票でき、同じ陣営の再投票は変更なし', async () => {
    const { svc, events } = setup()
    expect(await svc.castSpectatorVote({ deviceId: DEV, side: 'A' })).toEqual({ side: 'A', changed: true })
    expect(await svc.castSpectatorVote({ deviceId: DEV, side: 'A' })).toEqual({ side: 'A', changed: false })
    expect(events.filter((e) => e.type === 'SPECTATOR_VOTE')).toHaveLength(1)
  })
  it('陣営を変えると最新だけが有効（イベントは追記）', async () => {
    const { svc, events } = setup()
    await svc.castSpectatorVote({ deviceId: DEV, side: 'A' })
    await svc.castSpectatorVote({ deviceId: DEV, side: 'B' })
    expect((await svc.getMyStatus({ deviceId: DEV })).spectatorVote).toBe('B')
    expect(events.filter((e) => e.type === 'SPECTATOR_VOTE')).toHaveLength(2)
  })
  it('不正な陣営・短すぎる端末IDは拒否', async () => {
    const { svc } = setup()
    expect(await code(svc.castSpectatorVote({ deviceId: DEV, side: 'C' }))).toBe('INVALID_INPUT')
    expect(await code(svc.castSpectatorVote({ deviceId: 'short', side: 'A' }))).toBe('INVALID_INPUT')
  })
  it('締切後・開始前・戦なしは受け付けない', async () => {
    t = 1_000 + 72 * 3600_000
    expect(await code(setup().svc.castSpectatorVote({ deviceId: DEV, side: 'A' }))).toBe('NOT_OPEN')
    t = 500
    expect(await code(setup().svc.castSpectatorVote({ deviceId: DEV, side: 'A' }))).toBe('NOT_OPEN')
    expect(await code(setup(null as never).svc.castSpectatorVote({ deviceId: DEV, side: 'A' }))).toBe('NO_BATTLE')
  })
})

describe('参戦', () => {
  it('ログイン必須', async () => {
    expect(await code(setup().svc.joinBattle({ side: 'A' }))).toBe('UNAUTHORIZED')
  })
  it('陣営は固定（二重参戦・陣営変更は不可）', async () => {
    const { svc } = setup()
    await svc.joinBattle({ userId: 'u1', side: 'A' })
    expect(await code(svc.joinBattle({ userId: 'u1', side: 'B' }))).toBe('ALREADY_MEMBER')
  })
  it('参戦すると、その端末の観客票は取り消される（二重計上防止）', async () => {
    const { svc, devices, events } = setup()
    await svc.castSpectatorVote({ deviceId: DEV, side: 'A' })
    await svc.joinBattle({ userId: 'u1', side: 'B', deviceId: DEV })
    expect([...devices.values()][0]?.revoked).toBe(true)
    expect(events.some((e) => e.type === 'REVOKE')).toBe(true)
    expect((await svc.getMyStatus({ deviceId: DEV })).spectatorVote).toBeNull()
    expect(await code(svc.castSpectatorVote({ deviceId: DEV, side: 'A' }))).toBe('ALREADY_MEMBER')
  })
  it('匿名IDは戦内で安定し、他ユーザーと異なる', async () => {
    const { svc } = setup()
    const a = await svc.joinBattle({ userId: 'u1', side: 'A' })
    const b = await svc.joinBattle({ userId: 'u2', side: 'A' })
    expect(a.alias).toMatch(/^A陣営#[0-9a-f]{4}$/)
    expect(a.alias).not.toBe(b.alias)
    expect((await svc.getMyStatus({ userId: 'u1' })).member?.alias).toBe(a.alias)
  })
})

describe('書き込み', () => {
  it('未参戦は書けない / 自分の陣営以外は書けない', async () => {
    const { svc } = setup()
    expect(await code(svc.createPost({ userId: 'u1', side: 'A', body: 'こんにちは' }))).toBe('NOT_MEMBER')
    await svc.joinBattle({ userId: 'u1', side: 'A' })
    expect(await code(svc.createPost({ userId: 'u1', side: 'B', body: 'こんにちは' }))).toBe('WRONG_SIDE')
  })
  it('書き込みは陣営スレに通し番号で載る', async () => {
    const { svc } = setup()
    await svc.joinBattle({ userId: 'u1', side: 'A' })
    await svc.joinBattle({ userId: 'u2', side: 'B' })
    const p1 = await svc.createPost({ userId: 'u1', side: 'A', body: 'リモート最高' })
    t += gameConfig.limits.postCooldownSec * 1000
    const p2 = await svc.createPost({ userId: 'u2', side: 'B', body: '出社が良い' })
    expect([p1.postNo, p2.postNo]).toEqual([1, 2])
    expect((await svc.listPosts({ side: 'A' })).posts.map((p) => p.body)).toEqual(['リモート最高'])
    expect((await svc.listPosts({ side: 'B' })).posts.map((p) => p.postNo)).toEqual([2])
  })
  it('301字・URL・NGワードは拒否され、連投カウントも消費しない', async () => {
    const { svc } = setup()
    await svc.joinBattle({ userId: 'u1', side: 'A' })
    const err = async (body: string) => {
      try {
        await svc.createPost({ userId: 'u1', side: 'A', body })
      } catch (e) {
        return (e as ApiError).detail?.code
      }
    }
    expect(await err('あ'.repeat(301))).toBe('TOO_LONG')
    expect(await err('https://a.com')).toBe('URL')
    expect(await err('死ね')).toBe('NG_WORD')
    await expect(svc.createPost({ userId: 'u1', side: 'A', body: '普通の意見' })).resolves.toMatchObject({ postNo: 1 })
  })
  it('連投制限（クールダウン）', async () => {
    const { svc } = setup()
    await svc.joinBattle({ userId: 'u1', side: 'A' })
    await svc.createPost({ userId: 'u1', side: 'A', body: '1件目' })
    t += 1000
    expect(await code(svc.createPost({ userId: 'u1', side: 'A', body: '2件目' }))).toBe('RATE_LIMIT')
    t += gameConfig.limits.postCooldownSec * 1000
    await expect(svc.createPost({ userId: 'u1', side: 'A', body: '2件目' })).resolves.toBeDefined()
  })
  it('締切後は書けない', async () => {
    const { svc } = setup()
    await svc.joinBattle({ userId: 'u1', side: 'A' })
    t = 1_000 + 72 * 3600_000
    expect(await code(svc.createPost({ userId: 'u1', side: 'A', body: '遅刻' }))).toBe('NOT_OPEN')
  })
  it('一覧は afterPostNo でページングできる', async () => {
    const { svc } = setup()
    await svc.joinBattle({ userId: 'u1', side: 'A' })
    for (let i = 0; i < 3; i++) {
      await svc.createPost({ userId: 'u1', side: 'A', body: `n${i}` })
      t += gameConfig.limits.postCooldownSec * 1000
    }
    expect((await svc.listPosts({ side: 'A', afterPostNo: 1 })).posts.map((p) => p.postNo)).toEqual([2, 3])
  })
})
