import type { BattleMeta, PostItem, Side } from '../../../shared/types'

export interface MemberRecord {
  side: Side
  switched: boolean
}

export interface DeviceVoteRecord {
  side: Side
  revoked: boolean
}

/** 永続化の境界。ConditionExpression 等による一意制約はこの層の責務 */
export interface Repo {
  getCurrentBattle(): Promise<BattleMeta | null>
  getMember(battleId: string, userId: string): Promise<MemberRecord | null>
  getDeviceVote(battleId: string, deviceHash: string): Promise<DeviceVoteRecord | null>

  /** 参戦。すでに参戦済みなら 'ALREADY_MEMBER' を投げる。deviceHash があればその端末の観客票を取消す */
  joinBattle(a: {
    battleId: string
    userId: string
    side: Side
    now: number
    deviceHash?: string
  }): Promise<void>

  /** 観客票。prevSide は呼び出し側が読んだ値で、競合時は 'CONFLICT' を投げる */
  upsertDeviceVote(a: {
    battleId: string
    deviceHash: string
    side: Side
    prevSide: Side | null
    weight: number
    now: number
  }): Promise<void>

  /** 連投制限。超過なら 'RATE_LIMIT' を投げる */
  touchPostRate(a: {
    battleId: string
    userId: string
    now: number
    cooldownSec: number
    dailyMax: number
    dateKey: string
  }): Promise<void>

  /** レス番号を採番して保存し、POST_CREATED イベントも同時に追記する */
  createPost(a: {
    battleId: string
    userId: string
    authorAlias: string
    side: Side
    body: string
    now: number
  }): Promise<PostItem>

  listPosts(a: { battleId: string; side: Side; afterPostNo: number; limit: number }): Promise<PostItem[]>
}

export class RepoError extends Error {
  constructor(public code: 'ALREADY_MEMBER' | 'CONFLICT' | 'RATE_LIMIT') {
    super(code)
  }
}
