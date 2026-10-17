import type { BattleStatus, PostItem, Side } from '../shared/types'
import { amplifyApi } from './amplifyApi'
import { mockApi } from './mockApi'

export interface BattleView {
  battleId: string
  theme: string
  sideLabels: Record<Side, string>
  startAt: number
  endAt: number
  status: BattleStatus
  accepting: boolean
  serverNow: number
}

export interface MyStatus {
  member: { side: Side; switched: boolean; alias: string } | null
  spectatorVote: Side | null
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; detail?: { code: string; max?: number; word?: string } }

export interface Api {
  getCurrentBattle(): Promise<ApiResult<BattleView | null>>
  getMyStatus(deviceId: string, loggedIn: boolean): Promise<ApiResult<MyStatus>>
  listPosts(side: Side, afterPostNo?: number): Promise<ApiResult<{ posts: PostItem[]; next: number | null }>>
  castSpectatorVote(deviceId: string, side: Side): Promise<ApiResult<{ side: Side; changed: boolean }>>
  joinBattle(side: Side, deviceId: string): Promise<ApiResult<{ side: Side; alias: string }>>
  createPost(side: Side, body: string): Promise<ApiResult<PostItem>>
}

export const isMock = import.meta.env.VITE_MOCK === '1'
export const api: Api = isMock ? mockApi : amplifyApi

const MESSAGES: Record<string, string> = {
  NO_BATTLE: '開催中の戦はありません',
  NOT_OPEN: '受付時間外です',
  NOT_MEMBER: '先に陣営を選んで参戦してください',
  ALREADY_MEMBER: 'すでに参戦済みです（陣営は変更できません）',
  WRONG_SIDE: '自分の陣営のスレにしか書き込めません',
  RATE_LIMIT: '連投制限です。少し待ってください',
  INVALID_INPUT: '入力が正しくありません',
  UNAUTHORIZED: 'ログインが必要です',
  CONFLICT: '混み合っています。もう一度お試しください',
}
const BODY_MESSAGES: Record<string, (d: { max?: number; word?: string }) => string> = {
  EMPTY: () => '本文を入力してください',
  TOO_LONG: (d) => `${d.max}字以内で入力してください`,
  TOO_MANY_NEWLINES: (d) => `改行は${d.max}個までです`,
  URL: () => 'URL（リンク）は書き込めません',
  NG_WORD: (d) => `使えない言葉が含まれています：「${d.word}」`,
}

export function errorMessage(r: { code: string; detail?: { code: string; max?: number; word?: string } }): string {
  if (r.code === 'INVALID_BODY' && r.detail) return BODY_MESSAGES[r.detail.code]?.(r.detail) ?? '本文が正しくありません'
  return MESSAGES[r.code] ?? 'エラーが発生しました'
}
