import type { BattleMeta, PostItem, Side } from '../shared/types'
import { RepoError, type DeviceVoteRecord, type MemberRecord, type Repo } from '../amplify/functions/api/repo'

/** テスト用のメモリ実装。DynamoDB実装と同じ制約（一意・競合・連投）を再現する */
export function createMemoryRepo(battle: BattleMeta | null) {
  const members = new Map<string, MemberRecord>()
  const devices = new Map<string, DeviceVoteRecord & { weight: number }>()
  const posts: (PostItem & { authorId: string })[] = []
  const events: { type: string; actorId: string; payload: unknown }[] = []
  const lastPostAt = new Map<string, number>()
  const daily = new Map<string, number>()
  let nextPostNo = 0

  const repo: Repo = {
    async getCurrentBattle() {
      return battle
    },
    async getMember(_b, userId) {
      return members.get(userId) ?? null
    },
    async getDeviceVote(_b, dh) {
      const v = devices.get(dh)
      return v ? { side: v.side, revoked: v.revoked } : null
    },
    async joinBattle({ userId, side, deviceHash }) {
      if (members.has(userId)) throw new RepoError('ALREADY_MEMBER')
      members.set(userId, { side, switched: false })
      events.push({ type: 'JOIN', actorId: userId, payload: { side } })
      const dev = deviceHash ? devices.get(deviceHash) : undefined
      if (dev && !dev.revoked) {
        dev.revoked = true
        events.push({ type: 'REVOKE', actorId: userId, payload: { side: dev.side } })
      }
    },
    async upsertDeviceVote({ deviceHash, side, prevSide, weight }) {
      const cur = devices.get(deviceHash)
      if ((cur?.side ?? null) !== prevSide) throw new RepoError('CONFLICT')
      devices.set(deviceHash, { side, revoked: false, weight })
      events.push({ type: 'SPECTATOR_VOTE', actorId: deviceHash, payload: { side, prevSide } })
    },
    async touchPostRate({ userId, now, cooldownSec, dailyMax, dateKey }) {
      const last = lastPostAt.get(userId)
      if (last !== undefined && last > now - cooldownSec * 1000) throw new RepoError('RATE_LIMIT')
      lastPostAt.set(userId, now)
      const k = `${userId}#${dateKey}`
      const n = daily.get(k) ?? 0
      if (n >= dailyMax) throw new RepoError('RATE_LIMIT')
      daily.set(k, n + 1)
    },
    async createPost({ userId, authorAlias, side, body, now }) {
      const post: PostItem = { postNo: ++nextPostNo, side, authorAlias, kind: 'USER', body, createdAt: now }
      posts.push({ ...post, authorId: userId })
      events.push({ type: 'POST_CREATED', actorId: userId, payload: { postNo: post.postNo, side } })
      return post
    },
    async listPosts({ side, afterPostNo, limit }) {
      return posts
        .filter((p) => p.side === side && p.postNo > afterPostNo)
        .slice(0, limit)
        .map(({ authorId: _a, ...p }) => p)
    },
  }
  return { repo, members, devices, posts, events }
}

export function openBattle(over: Partial<BattleMeta> = {}): BattleMeta {
  return {
    battleId: 'b1',
    theme: 'リモートvs出社',
    sideLabels: { A: 'リモート', B: '出社' } as Record<Side, string>,
    startAt: 1_000,
    endAt: 1_000 + 72 * 3600_000,
    status: 'OPEN',
    mode: 'FULL',
    ...over,
  }
}
