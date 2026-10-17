import { gameConfig } from '../shared/gameConfig'
import { validatePostBody } from '../shared/textRules'
import type { PostItem, Side } from '../shared/types'
import type { Api, ApiResult } from './api'

/**
 * バックエンドなしでUIを動かすためのモック (VITE_MOCK=1)。状態は localStorage に保存する。
 * 本物のルールは amplify/functions/api/service.ts にある。ここは画面確認用の簡易版。
 */
const KEY = 'faction-bbs-mock'
interface State {
  startAt: number
  votes: Side | null
  member: { side: Side; alias: string } | null
  posts: PostItem[]
  lastPostAt: number
}
const load = (): State => {
  try {
    const s = localStorage.getItem(KEY)
    if (s) return JSON.parse(s)
  } catch {
    /* noop */
  }
  return { startAt: Date.now() - 3600_000, votes: null, member: null, posts: [], lastPostAt: 0 }
}
const save = (s: State) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* noop */
  }
}
const ok = <T,>(data: T): Promise<ApiResult<T>> => Promise.resolve({ ok: true, data })
const ng = (code: string, detail?: { code: string; max?: number; word?: string }): Promise<ApiResult<never>> =>
  Promise.resolve({ ok: false, code, detail })

export const mockApi: Api = {
  getCurrentBattle() {
    const s = load()
    return ok({
      battleId: 'mock',
      theme: 'リモートワーク vs 出社',
      sideLabels: { A: 'リモート派', B: '出社派' },
      startAt: s.startAt,
      endAt: s.startAt + 72 * 3600_000,
      status: 'OPEN' as const,
      accepting: true,
      serverNow: Date.now(),
    })
  },
  getMyStatus(_d, loggedIn) {
    const s = load()
    return ok({
      member: loggedIn && s.member ? { ...s.member, switched: false } : null,
      spectatorVote: loggedIn ? null : s.votes,
    })
  },
  listPosts(side, after = 0) {
    const posts = load().posts.filter((p) => p.side === side && p.postNo > after)
    return ok({ posts, next: null })
  },
  castSpectatorVote(_d, side) {
    const s = load()
    const changed = s.votes !== side
    s.votes = side
    save(s)
    return ok({ side, changed })
  },
  joinBattle(side) {
    const s = load()
    if (s.member) return ng('ALREADY_MEMBER')
    s.member = { side, alias: `${side}陣営#${Math.random().toString(16).slice(2, 6)}` }
    save(s)
    return ok({ side, alias: s.member.alias })
  },
  createPost(side, body) {
    const s = load()
    if (!s.member) return ng('NOT_MEMBER')
    if (s.member.side !== side) return ng('WRONG_SIDE')
    const v = validatePostBody(body)
    if (v) return ng('INVALID_BODY', v)
    if (Date.now() - s.lastPostAt < gameConfig.limits.postCooldownSec * 1000) return ng('RATE_LIMIT')
    const post: PostItem = {
      postNo: s.posts.length + 1,
      side,
      authorAlias: s.member.alias,
      kind: 'USER',
      body,
      createdAt: Date.now(),
    }
    s.posts.push(post)
    s.lastPostAt = Date.now()
    save(s)
    return ok(post)
  },
}
