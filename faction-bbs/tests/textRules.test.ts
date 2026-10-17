import { describe, expect, it } from 'vitest'
import { containsUrl, countChars, findNgWord, validatePostBody } from '../shared/textRules'

describe('countChars', () => {
  it('絵文字・結合文字を1字として数える', () => {
    expect(countChars('あいう')).toBe(3)
    expect(countChars('👨‍👩‍👧')).toBe(1)
    expect(countChars('a\nb')).toBe(3)
  })
})

describe('containsUrl', () => {
  it.each(['https://example.com', 'http://x', 'www.example', 'example.com/path', 'ｈｔｔｐｓ：／／ｅｘ．ｃｏｍ', 'foo.co.jp', 'h t t p s : / /a'])(
    '検出する: %s',
    (t) => expect(containsUrl(t)).toBe(true),
  )
  it.each(['リモートが良いと思う', '>>12 に同意', 'Twitterで見た', '3.14は円周率', '2人以上'])(
    '誤検出しない: %s',
    (t) => expect(containsUrl(t)).toBe(false),
  )
})

describe('findNgWord', () => {
  it('表記揺れ（カタカナ・全角・空白）を吸収する', () => {
    expect(findNgWord('おまえ シネ よ')).toBe('しね')
    expect(findNgWord('ＤＭ 下さい')).not.toBeNull()
    expect(findNgWord('出社には利点がある')).toBeNull()
  })
})

describe('validatePostBody', () => {
  it('正常系', () => expect(validatePostBody('リモートの方が生産性は高い')).toBeNull())
  it('空', () => expect(validatePostBody('  \n ')).toEqual({ code: 'EMPTY' }))
  it('300字ちょうどはOK、301字はNG', () => {
    expect(validatePostBody('あ'.repeat(300))).toBeNull()
    expect(validatePostBody('あ'.repeat(301))).toEqual({ code: 'TOO_LONG', max: 300 })
  })
  it('改行は5個まで', () => {
    expect(validatePostBody('a\n'.repeat(5) + 'b')).toBeNull()
    expect(validatePostBody('a\n'.repeat(6) + 'b')).toEqual({ code: 'TOO_MANY_NEWLINES', max: 5 })
  })
  it('URL・NGワード', () => {
    expect(validatePostBody('見て https://a.com')).toEqual({ code: 'URL' })
    expect(validatePostBody('死ね')).toMatchObject({ code: 'NG_WORD' })
  })
})
