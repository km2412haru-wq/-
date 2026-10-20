import { describe, expect, it } from 'vitest'
import { decodeResult } from '../src/decode'

const body = { ok: true, data: { theme: 'x' } }

describe('decodeResult', () => {
  it('オブジェクト・1重・2重・3重の包みをすべて解読する', () => {
    const once = JSON.stringify(body)
    const twice = JSON.stringify(once)
    expect(decodeResult(body)).toEqual(body)
    expect(decodeResult(once)).toEqual(body)
    expect(decodeResult(twice)).toEqual(body)
    expect(decodeResult(JSON.stringify(twice))).toEqual(body)
  })
  it('エラー応答もそのまま返す', () => {
    expect(decodeResult(JSON.stringify({ ok: false, code: 'NOT_OPEN' }))).toEqual({ ok: false, code: 'NOT_OPEN' })
  })
  it('想定外の形は BAD_RESPONSE にして中身を示す', () => {
    expect(decodeResult(null)).toMatchObject({ ok: false, code: 'BAD_RESPONSE' })
    expect(decodeResult('hello')).toMatchObject({ ok: false, code: 'BAD_RESPONSE' })
    expect(decodeResult({ foo: 1 })).toMatchObject({ ok: false, code: 'BAD_RESPONSE' })
  })
})
