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

// 指定した資格試験の問題プールから、重複なくランダムに出題数分を抽出する。
// 難易度別・ドメイン別の出題比率調整はスコープ外（意図的に行わない）。
export function pickExamQuestions(examId) {
  const exam = getExam(examId)
  const examQuestions = questions.filter((q) => q.exam === examId)
  return shuffle(examQuestions).slice(0, exam.examLength)
}
