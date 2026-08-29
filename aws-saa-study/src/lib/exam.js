import questions from '../data/questions.json'
import { getExam } from '../data/exams.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 指定した資格試験の出題比率に応じてバランスよく問題を抽出する。
// 各ドメインの問題数が不足している場合は他ドメインから補う。
export function pickExamQuestions(examId) {
  const exam = getExam(examId)
  const length = exam.examLength
  const examQuestions = questions.filter((q) => q.exam === examId)

  const pools = {}
  for (const d of exam.domains) {
    pools[d.id] = shuffle(examQuestions.filter((q) => q.domain === d.id))
  }

  const totalWeight = exam.domains.reduce((sum, d) => sum + d.weight, 0)
  const picked = []
  const leftovers = []

  for (const d of exam.domains) {
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
