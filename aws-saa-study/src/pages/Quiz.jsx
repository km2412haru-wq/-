import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import questions from '../data/questions.json'
import { useExam } from '../context/ExamContext.jsx'
import { domainName } from '../data/exams.js'
import { recordQuizAnswer, getDueReviewQuestionIds } from '../lib/storage.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Quiz() {
  const { examId, exam } = useExam()
  const [searchParams] = useSearchParams()
  const reviewMode = searchParams.get('mode') === 'review'

  const [domainFilter, setDomainFilter] = useState('all')
  const [queue, setQueue] = useState(null) // null = 未開始
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)

  const examQuestions = useMemo(() => questions.filter((q) => q.exam === examId), [examId])

  const dueReviewIds = useMemo(() => {
    const examQuestionIds = new Set(examQuestions.map((q) => q.id))
    return getDueReviewQuestionIds().filter((id) => examQuestionIds.has(id))
  }, [examQuestions])

  function startQuiz(useReview) {
    let pool
    if (useReview) {
      pool = examQuestions.filter((q) => dueReviewIds.includes(q.id))
    } else {
      pool =
        domainFilter === 'all'
          ? examQuestions
          : examQuestions.filter((q) => String(q.domain) === domainFilter)
    }
    setQueue(shuffle(pool))
    setIndex(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
  }

  function handleSelect(choiceIndex) {
    if (answered) return
    setSelected(choiceIndex)
    setAnswered(true)
    const current = queue[index]
    const isCorrect = choiceIndex === current.correctIndex
    if (isCorrect) setScore((s) => s + 1)
    recordQuizAnswer(current.id, isCorrect)
  }

  function handleNext() {
    setSelected(null)
    setAnswered(false)
    setIndex((i) => i + 1)
  }

  // --- 開始前画面 ---
  if (!queue) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-bold">② クイズ演習（{exam.code}）</h1>

        {reviewMode && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="mb-2 text-sm text-amber-800">
              復習期限が来た問題: <span className="font-bold">{dueReviewIds.length}問</span>
            </p>
            <button
              disabled={dueReviewIds.length === 0}
              onClick={() => startQuiz(true)}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
            >
              復習問題を解く
            </button>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            出題ドメインを選択
          </label>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">すべてのドメイン</option>
            {exam.domains.map((d) => (
              <option key={d.id} value={d.id}>
                ドメイン{d.id}: {d.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => startQuiz(false)}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            クイズを開始
          </button>
        </div>
      </div>
    )
  }

  // --- 出題完了画面 ---
  if (index >= queue.length) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold">お疲れさまでした！</h1>
        <p className="text-3xl font-bold text-blue-600">
          {score} / {queue.length} 問正解
        </p>
        <button
          onClick={() => setQueue(null)}
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          クイズ選択に戻る
        </button>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        該当する問題がありません。
        <div>
          <button
            onClick={() => setQueue(null)}
            className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  const q = queue[index]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          問題 {index + 1} / {queue.length}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
          ドメイン{q.domain}: {domainName(examId, q.domain)}
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="mb-5 whitespace-pre-wrap text-base font-medium text-slate-900">
          {q.question}
        </p>

        <div className="space-y-2">
          {q.choices.map((choice, i) => {
            let style = 'border-slate-200 hover:bg-slate-50'
            if (answered) {
              if (i === q.correctIndex) {
                style = 'border-emerald-400 bg-emerald-50 text-emerald-800'
              } else if (i === selected) {
                style = 'border-rose-400 bg-rose-50 text-rose-800'
              } else {
                style = 'border-slate-200 opacity-60'
              }
            }
            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => handleSelect(i)}
                className={`block w-full rounded-md border px-4 py-2.5 text-left text-sm transition-colors ${style}`}
              >
                <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                {choice}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="mt-5 rounded-md bg-slate-50 p-4">
            <p className="mb-1 font-semibold">
              {selected === q.correctIndex ? '✅ 正解' : '❌ 不正解'}
            </p>
            <p className="text-sm text-slate-700">{q.explanation}</p>
          </div>
        )}
      </div>

      {answered && (
        <button
          onClick={handleNext}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          {index + 1 === queue.length ? '結果を見る' : '次の問題へ'}
        </button>
      )}
    </div>
  )
}
