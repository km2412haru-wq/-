import { describe, expect, it } from 'vitest'
import { HOUR_MS } from '../shared/gameConfig'
import { buildSchedule, currentPhase, isAcceptingInput, jstDateKey } from '../shared/phase'

const start = Date.UTC(2026, 0, 5, 3, 0, 0)

describe('phase', () => {
  const s = buildSchedule(start)
  it('境界でフェーズが切り替わる', () => {
    expect(currentPhase(s, start - 1)).toBe('BEFORE')
    expect(currentPhase(s, start)).toBe('DAY1')
    expect(currentPhase(s, start + 24 * HOUR_MS)).toBe('DAY2')
    expect(currentPhase(s, start + 48 * HOUR_MS)).toBe('DAY3')
    expect(currentPhase(s, start + 72 * HOUR_MS)).toBe('CLOSED')
  })
  it('圧縮モード', () => {
    const c = buildSchedule(start, 0.5)
    expect(c.endAt - c.startAt).toBe(1.5 * HOUR_MS)
  })
  it('受付判定は時刻とstatusの両方', () => {
    const meta = { startAt: s.startAt, endAt: s.endAt, status: 'OPEN' as const }
    expect(isAcceptingInput(meta, start + 1)).toBe(true)
    expect(isAcceptingInput(meta, s.endAt)).toBe(false)
    expect(isAcceptingInput({ ...meta, status: 'CLOSED' }, start + 1)).toBe(false)
  })
  it('JST日付', () => {
    expect(jstDateKey(Date.UTC(2026, 0, 5, 14, 59))).toBe('2026-01-05')
    expect(jstDateKey(Date.UTC(2026, 0, 5, 15, 0))).toBe('2026-01-06')
  })
})
