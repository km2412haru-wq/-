import questions from '../data/questions.json'
import { getExam } from '../data/exams.js'

function shuffle(array) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 選択肢の並び順をシャッフルしつつ correctIndex を再計算する
function shuffleChoices(question) {
  const order = shuffle(question.choices.map((_, i) => i))
  return {
    ...question,
    choices: order.map((i) => question.choices[i]),
    correctIndex: order.indexOf(question.correctIndex),
  }
}

// 資格×難易度の組み合わせで、実際に出題可能な問題数（プール数）を返す。
// 開始前の画面で「この組み合わせは何問あるか」を事前に見せるために使う。
export function countAvailable(examId, difficultyId) {
  return questions.filter((q) => q.exam === examId && q.difficulty === difficultyId).length
}

// 資格×難易度の組み合わせで出題する問題セットを組み立てる。
// 該当問題数が資格の基本出題数に満たない場合は、実際に存在する数まで自動的に減らす。
export function buildExamSet(examId, difficultyId) {
  const exam = getExam(examId)
  const pool = questions.filter((q) => q.exam === examId && q.difficulty === difficultyId)
  const requestedCount = exam.baseQuestionCount
  const actualCount = Math.min(requestedCount, pool.length)
  const selected = shuffle(pool).slice(0, actualCount)
  const examQuestions = selected.map(shuffleChoices)
  return {
    questions: examQuestions,
    requestedCount,
    actualCount,
    reduced: actualCount < requestedCount,
  }
}

// answers: { [questionId]: choiceIndex | undefined }（未回答は undefined/null）
export function scoreExam(examQuestions, answers) {
  const exam = getExam(examQuestions[0]?.exam)
  const results = examQuestions.map((q) => {
    const selectedIndex = answers[q.id] ?? null
    const correct = selectedIndex === q.correctIndex
    return { question: q, selectedIndex, correct }
  })

  const correctCount = results.filter((r) => r.correct).length
  const totalCount = results.length

  const domainMap = new Map()
  for (const r of results) {
    const domainId = r.question.domain
    if (!domainMap.has(domainId)) {
      domainMap.set(domainId, { domainId, correct: 0, total: 0 })
    }
    const entry = domainMap.get(domainId)
    entry.total += 1
    if (r.correct) entry.correct += 1
  }
  const domainBreakdown = [...domainMap.values()].sort((a, b) => a.domainId - b.domainId)

  // 100〜1000点の単純な線形換算（本番はIRTによる重み付け採点であり仕組みが異なる。詳細はUI側に明記）
  const predictedScore =
    totalCount === 0 ? 100 : Math.round(100 + (correctCount / totalCount) * 900)
  const passed = predictedScore >= exam.passingScore

  return { results, correctCount, totalCount, domainBreakdown, predictedScore, passed, exam }
}
