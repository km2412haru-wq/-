// localStorage を使った永続化。サーバーは使わず、個人利用のみを想定。
// v2: 複数資格（SAA / CLF等）対応のため、読了状態のキーに資格IDを含めるよう変更。
const STORAGE_KEY = 'saa-study-data-v2'

const DEFAULT_DATA = {
  readSummaries: {}, // { "domain-service": true }
  quizStats: {}, // { questionId: { seen, correct, incorrect } }
  reviewList: {}, // { questionId: { stage, nextReviewAt, lastResult } }
  examHistory: [], // [{ id, date, score, total, domainBreakdown, wrongIds }]
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_DATA)
    const parsed = JSON.parse(raw)
    return { ...structuredClone(DEFAULT_DATA), ...parsed }
  } catch {
    return structuredClone(DEFAULT_DATA)
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorageが使えない環境（プライベートモード等）では静かに諦める
  }
}

// ---- サマリー既読管理 ----
export function summaryKey(examId, domain, service) {
  return `${examId}-${domain}-${service}`
}

export function isSummaryRead(examId, domain, service) {
  const data = load()
  return Boolean(data.readSummaries[summaryKey(examId, domain, service)])
}

export function setSummaryRead(examId, domain, service, read) {
  const data = load()
  const key = summaryKey(examId, domain, service)
  if (read) {
    data.readSummaries[key] = true
  } else {
    delete data.readSummaries[key]
  }
  save(data)
}

export function getReadSummaries() {
  return load().readSummaries
}

// ---- クイズ統計 & 間隔反復（復習リスト） ----
const INTERVALS_DAYS = [1, 3, 7] // 復習ステージごとの再出題までの日数

export function recordQuizAnswer(questionId, isCorrect) {
  const data = load()
  const stat = data.quizStats[questionId] ?? { seen: 0, correct: 0, incorrect: 0 }
  stat.seen += 1
  if (isCorrect) stat.correct += 1
  else stat.incorrect += 1
  data.quizStats[questionId] = stat

  const review = data.reviewList[questionId]
  const now = Date.now()
  if (isCorrect) {
    if (review) {
      const nextStage = review.stage + 1
      if (nextStage >= INTERVALS_DAYS.length) {
        // マスター済みとして復習リストから除外
        delete data.reviewList[questionId]
      } else {
        data.reviewList[questionId] = {
          stage: nextStage,
          nextReviewAt: now + INTERVALS_DAYS[nextStage] * 86400000,
          lastResult: 'correct',
        }
      }
    }
    // 復習リストに無い問題を正解しても新規追加はしない（間違えた問題のみ復習対象）
  } else {
    data.reviewList[questionId] = {
      stage: 0,
      nextReviewAt: now + INTERVALS_DAYS[0] * 86400000,
      lastResult: 'wrong',
    }
  }
  save(data)
}

export function getQuizStats() {
  return load().quizStats
}

export function getReviewList() {
  return load().reviewList
}

export function getDueReviewQuestionIds() {
  const data = load()
  const now = Date.now()
  return Object.entries(data.reviewList)
    .filter(([, v]) => v.nextReviewAt <= now)
    .map(([id]) => id)
}

// ---- 模擬試験履歴 ----
export function saveExamResult(result) {
  const data = load()
  data.examHistory.push({ id: `exam-${Date.now()}`, date: new Date().toISOString(), ...result })
  save(data)
}

export function getExamHistory() {
  return load().examHistory
}

// ---- 全データリセット（デバッグ・やり直し用） ----
export function resetAllData() {
  save(structuredClone(DEFAULT_DATA))
}
