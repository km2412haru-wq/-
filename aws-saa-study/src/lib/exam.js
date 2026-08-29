import questions from '../data/questions.json'
import { DOMAINS } from '../data/domains.js'

export const EXAM_LENGTH = 20
export const EXAM_DURATION_SEC = 40 * 60 // 40分（本番は65問130分だが短縮ミニ模試）

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ドメインの出題比率に応じてバランスよく問題を抽出する。
// 各ドメインの問題数が不足している場合は他ドメインから補う。
export function pickExamQuestions(length = EXAM_LENGTH) {
  const pools = {}
  for (const d of DOMAINS) {
    pools[d.id] = shuffle(questions.filter((q) => q.domain === d.id))
  }

  const totalWeight = DOMAINS.reduce((sum, d) => sum + d.weight, 0)
  const picked = []
  const leftovers = []

  for (const d of DOMAINS) {
    const quota = Math.round((d.weight / totalWeight) * length)
    const take = pools[d.id].splice(0, quota)
    picked.push(...take)
    leftovers.push(...pools[d.id])
  }

  // 不足分を余っている問題からランダムに補充
  if (picked.length < length) {
    const need = length - picked.length
    picked.push(...shuffle(leftovers).slice(0, need))
  }

  return shuffle(picked.slice(0, length))
}
