import type { ApiResult } from './api'

/**
 * AppSync の AWSJSON は、Lambda が返した文字列をさらに JSON として包んで返すことがある。
 * 何重に包まれていても、オブジェクトになるまで解読する（最大3回）。
 */
export function decodeResult<T>(raw: unknown): ApiResult<T> {
  let v = raw
  for (let i = 0; i < 3 && typeof v === 'string'; i++) {
    try {
      v = JSON.parse(v)
    } catch {
      break
    }
  }
  if (v && typeof v === 'object' && typeof (v as { ok?: unknown }).ok === 'boolean') {
    return v as ApiResult<T>
  }
  return { ok: false, code: 'BAD_RESPONSE', message: `unexpected response (${typeof v}): ${String(JSON.stringify(v)).slice(0, 120)}` }
}
