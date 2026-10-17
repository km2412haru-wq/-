import { gameConfig } from './gameConfig'
import { NG_WORDS } from './ngWords'

export type TextViolation =
  | { code: 'EMPTY' }
  | { code: 'TOO_LONG'; max: number }
  | { code: 'TOO_MANY_NEWLINES'; max: number }
  | { code: 'URL' }
  | { code: 'NG_WORD'; word: string }

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
    : null

/** 書記素単位の文字数（絵文字・結合文字を1字として数える。改行も1字） */
export function countChars(text: string): number {
  if (!segmenter) return Array.from(text).length
  let n = 0
  for (const _ of segmenter.segment(text)) n++
  return n
}

/** NGワード・URL判定用の正規化: NFKC、小文字化、カタカナ→ひらがな、空白と記号の除去 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s​-‍﻿]+/g, '')
    .replace(/[!-/:-@[-`{-~、。・「」『』（）【】〜_]+/g, '')
}

// 「ドメイン.TLD」形式。TLDは主要なもの＋汎用の2〜3文字英字
const URL_PATTERNS: RegExp[] = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(?:com|net|org|jp|co|io|me|ly|gl|to|cc|tv|xyz|info|biz|app|dev|ai|gg|link|site|online|shop)\b/i,
  /\b[a-z0-9-]+\s*[.．。]\s*(?:com|net|org|jp|co\.jp|io|me|ly|xyz)\b/i,
  /h\s*t\s*t\s*p\s*s?\s*:\s*\/\s*\//i,
  /ｈｔｔｐ/i,
]

export function containsUrl(text: string): boolean {
  const nfkc = text.normalize('NFKC')
  // レス番号アンカー（>>12）はURL扱いしない: そもそもパターンに該当しない
  return URL_PATTERNS.some((re) => re.test(nfkc))
}

export function findNgWord(text: string, words: readonly string[] = NG_WORDS): string | null {
  const normalized = normalizeForMatch(text)
  for (const w of words) {
    const nw = normalizeForMatch(w)
    if (nw && normalized.includes(nw)) return w
  }
  return null
}

export function validatePostBody(
  body: string,
  opts: { maxChars?: number; maxNewlines?: number; ngWords?: readonly string[] } = {},
): TextViolation | null {
  const maxChars = opts.maxChars ?? gameConfig.limits.postMaxChars
  const maxNewlines = opts.maxNewlines ?? gameConfig.limits.postMaxNewlines
  const trimmed = body.trim()
  if (trimmed.length === 0) return { code: 'EMPTY' }
  if (countChars(body) > maxChars) return { code: 'TOO_LONG', max: maxChars }
  if ((body.match(/\n/g)?.length ?? 0) > maxNewlines) return { code: 'TOO_MANY_NEWLINES', max: maxNewlines }
  if (containsUrl(body)) return { code: 'URL' }
  const ng = findNgWord(body, opts.ngWords)
  if (ng) return { code: 'NG_WORD', word: ng }
  return null
}
