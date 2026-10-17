export type Side = 'A' | 'B'

export type BattleStatus =
  | 'SCHEDULED'
  | 'OPEN'
  | 'CLOSED'
  | 'JUDGING'
  | 'JUDGE_DEFERRED'
  | 'PENDING_HUMAN'
  | 'JUDGED'
  | 'APPEAL_WINDOW'
  | 'FINAL'

export type BattleMode = 'FULL' | 'VOTE_ONLY'

export interface BattleMeta {
  battleId: string
  theme: string
  sideLabels: Record<Side, string>
  startAt: number // epoch ms
  endAt: number
  status: BattleStatus
  mode: BattleMode
}

export interface PostItem {
  postNo: number
  side: Side
  authorAlias: string
  kind: 'USER' | 'AI_DIRECTIVE'
  body: string
  createdAt: number
}

export type ApiErrorCode =
  | 'NOT_OPEN'
  | 'NO_BATTLE'
  | 'NOT_MEMBER'
  | 'ALREADY_MEMBER'
  | 'WRONG_SIDE'
  | 'INVALID_BODY'
  | 'RATE_LIMIT'
  | 'INVALID_INPUT'
