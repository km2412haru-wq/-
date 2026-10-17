import { gameConfig, HOUR_MS } from './gameConfig'
import type { BattleMeta } from './types'

export type Phase = 'BEFORE' | 'DAY1' | 'DAY2' | 'DAY3' | 'CLOSED'

export interface PhaseSchedule {
  startAt: number
  day2At: number
  day3At: number
  endAt: number
}

/** 開始時刻から各フェーズの境界を算出する。dayHours を短縮すれば検証用の圧縮モードになる */
export function buildSchedule(
  startAt: number,
  dayHours: number = gameConfig.phase.dayHours,
): PhaseSchedule {
  const day = dayHours * HOUR_MS
  return { startAt, day2At: startAt + day, day3At: startAt + 2 * day, endAt: startAt + 3 * day }
}

export function currentPhase(s: PhaseSchedule, now: number): Phase {
  if (now < s.startAt) return 'BEFORE'
  if (now >= s.endAt) return 'CLOSED'
  if (now >= s.day3At) return 'DAY3'
  if (now >= s.day2At) return 'DAY2'
  return 'DAY1'
}

/** 書き込み・投票・鞍替えの受付可否。時刻と status の両方で判定する */
export function isAcceptingInput(
  meta: Pick<BattleMeta, 'startAt' | 'endAt' | 'status'>,
  now: number,
): boolean {
  return meta.status === 'OPEN' && now >= meta.startAt && now < meta.endAt
}

/** 代表レス投票が開けるのは3日目から */
export function isRepVotingOpen(s: PhaseSchedule, now: number): boolean {
  const p = currentPhase(s, now)
  return p === 'DAY3'
}

export function jstDateKey(epochMs: number): string {
  const jst = new Date(epochMs + 9 * HOUR_MS)
  return jst.toISOString().slice(0, 10)
}
