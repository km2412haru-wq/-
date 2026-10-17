import { createHmac } from 'node:crypto'
import { gameConfig } from '../../../shared/gameConfig'
import { isAcceptingInput, jstDateKey } from '../../../shared/phase'
import { validatePostBody, type TextViolation } from '../../../shared/textRules'
import type { ApiErrorCode, BattleMeta, PostItem, Side } from '../../../shared/types'
import { RepoError, type Repo } from './repo'

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode | 'CONFLICT' | 'UNAUTHORIZED',
    public detail?: TextViolation,
  ) {
    super(code)
  }
}

export interface ServiceDeps {
  repo: Repo
  secret: string
  now: () => number
}

const isSide = (v: unknown): v is Side => v === 'A' || v === 'B'

function hmac(secret: string, ...parts: string[]): string {
  return createHmac('sha256', secret).update(parts.join('\u0000')).digest('hex')
}

export function createService({ repo, secret, now }: ServiceDeps) {
  async function requireBattle(): Promise<BattleMeta> {
    const b = await repo.getCurrentBattle()
    if (!b) throw new ApiError('NO_BATTLE')
    return b
  }
  async function requireOpenBattle(): Promise<BattleMeta> {
    const b = await requireBattle()
    if (!isAcceptingInput(b, now())) throw new ApiError('NOT_OPEN')
    return b
  }
  const deviceHash = (battleId: string, deviceId: string) => hmac(secret, 'device', battleId, deviceId)
  /** 戦ごとの匿名ID（Q-27）。ユーザーIDからは逆引きできない */
  const aliasOf = (battleId: string, userId: string, side: Side) =>
    `${side}陣営#${hmac(secret, 'alias', battleId, userId).slice(0, 4)}`

  function requireUser(userId: string | undefined): string {
    if (!userId) throw new ApiError('UNAUTHORIZED')
    return userId
  }
  function requireDeviceId(deviceId: unknown): string {
    if (typeof deviceId !== 'string' || deviceId.length < 16 || deviceId.length > 64) {
      throw new ApiError('INVALID_INPUT')
    }
    return deviceId
  }

  return {
    async getCurrentBattle() {
      const b = await repo.getCurrentBattle()
      return b ? { ...b, accepting: isAcceptingInput(b, now()), serverNow: now() } : null
    },

    async getMyStatus(a: { userId?: string; deviceId?: string }) {
      const b = await requireBattle()
      if (a.userId) {
        const m = await repo.getMember(b.battleId, a.userId)
        return {
          member: m ? { side: m.side, switched: m.switched, alias: aliasOf(b.battleId, a.userId, m.side) } : null,
          spectatorVote: null as Side | null,
        }
      }
      let spectatorVote: Side | null = null
      if (a.deviceId) {
        const v = await repo.getDeviceVote(b.battleId, deviceHash(b.battleId, requireDeviceId(a.deviceId)))
        if (v && !v.revoked) spectatorVote = v.side
      }
      return { member: null, spectatorVote }
    },

    async castSpectatorVote(a: { deviceId: unknown; side: unknown }) {
      if (!isSide(a.side)) throw new ApiError('INVALID_INPUT')
      const b = await requireOpenBattle()
      const dh = deviceHash(b.battleId, requireDeviceId(a.deviceId))
      const prev = await repo.getDeviceVote(b.battleId, dh)
      if (prev?.revoked) throw new ApiError('ALREADY_MEMBER')
      if (prev?.side === a.side) return { side: a.side, changed: false }
      try {
        await repo.upsertDeviceVote({
          battleId: b.battleId,
          deviceHash: dh,
          side: a.side,
          prevSide: prev?.side ?? null,
          weight: gameConfig.trustWeight.L0,
          now: now(),
        })
      } catch (e) {
        if (e instanceof RepoError && e.code === 'CONFLICT') throw new ApiError('CONFLICT')
        throw e
      }
      return { side: a.side, changed: true }
    },

    async joinBattle(a: { userId?: string; side: unknown; deviceId?: unknown }) {
      const userId = requireUser(a.userId)
      if (!isSide(a.side)) throw new ApiError('INVALID_INPUT')
      const b = await requireOpenBattle()
      const dh =
        typeof a.deviceId === 'string' && a.deviceId ? deviceHash(b.battleId, requireDeviceId(a.deviceId)) : undefined
      try {
        await repo.joinBattle({ battleId: b.battleId, userId, side: a.side, now: now(), deviceHash: dh })
      } catch (e) {
        if (e instanceof RepoError && e.code === 'ALREADY_MEMBER') throw new ApiError('ALREADY_MEMBER')
        throw e
      }
      return { side: a.side, alias: aliasOf(b.battleId, userId, a.side) }
    },

    async createPost(a: { userId?: string; side: unknown; body: unknown }) {
      const userId = requireUser(a.userId)
      if (!isSide(a.side) || typeof a.body !== 'string') throw new ApiError('INVALID_INPUT')
      const b = await requireOpenBattle()
      const member = await repo.getMember(b.battleId, userId)
      if (!member) throw new ApiError('NOT_MEMBER')
      // 陣営はサーバー側の所属が正。クライアントの申告と違えば拒否する
      if (member.side !== a.side) throw new ApiError('WRONG_SIDE')
      const violation = validatePostBody(a.body)
      if (violation) throw new ApiError('INVALID_BODY', violation)
      try {
        await repo.touchPostRate({
          battleId: b.battleId,
          userId,
          now: now(),
          cooldownSec: gameConfig.limits.postCooldownSec,
          dailyMax: gameConfig.limits.postsPerUserPerDay,
          dateKey: jstDateKey(now()),
        })
      } catch (e) {
        if (e instanceof RepoError && e.code === 'RATE_LIMIT') throw new ApiError('RATE_LIMIT')
        throw e
      }
      return repo.createPost({
        battleId: b.battleId,
        userId,
        authorAlias: aliasOf(b.battleId, userId, member.side),
        side: member.side,
        body: a.body,
        now: now(),
      })
    },

    async listPosts(a: { side: unknown; afterPostNo?: unknown }): Promise<{ posts: PostItem[]; next: number | null }> {
      if (!isSide(a.side)) throw new ApiError('INVALID_INPUT')
      const b = await requireBattle()
      const after = typeof a.afterPostNo === 'number' && a.afterPostNo >= 0 ? Math.floor(a.afterPostNo) : 0
      const limit = gameConfig.limits.pageSize
      const posts = await repo.listPosts({ battleId: b.battleId, side: a.side, afterPostNo: after, limit })
      return { posts, next: posts.length === limit ? (posts[posts.length - 1]?.postNo ?? null) : null }
    },
  }
}

export type Service = ReturnType<typeof createService>
