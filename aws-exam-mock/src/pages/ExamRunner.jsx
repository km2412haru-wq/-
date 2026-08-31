import { useState } from 'react'
import Timer from '../components/Timer.jsx'
import { EXAM_DURATION_SEC, getExam } from '../data/exams.js'

export default function ExamRunner({ examSet, onFinish }) {
  const { questions, reduced, requestedCount, actualCount } = examSet
  const exam = getExam(questions[0]?.exam)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})

  const question = questions[index]
  const isLast = index === questions.length - 1
  const selectedIndex = answers[question.id] ?? null

  function selectChoice(choiceIndex) {
    setAnswers((prev) => ({ ...prev, [question.id]: choiceIndex }))
  }

  function goNext() {
    if (isLast) {
      onFinish(answers)
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {exam.code} ／ 第{index + 1}問 / 全{questions.length}問
        </div>
        <Timer durationSec={EXAM_DURATION_SEC} onExpire={() => onFinish(answers)} />
      </div>

      {reduced && (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          この難易度は問題数が{actualCount}問しかないため、今回は{requestedCount}問ではなく
          {actualCount}問で実施しています。
        </div>
      )}

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-orange-500 transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="whitespace-pre-wrap text-base font-medium text-slate-900">
          {question.question}
        </p>

        <div className="mt-5 space-y-2">
          {question.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectChoice(i)}
              className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                selectedIndex === i
                  ? 'border-orange-500 bg-orange-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="mr-2 font-semibold text-slate-400">
                {String.fromCharCode(65 + i)}
              </span>
              {choice}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {selectedIndex === null ? '未回答のまま次へ進むと不正解として扱われます' : ''}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="rounded-xl bg-orange-600 px-6 py-2.5 font-semibold text-white transition hover:bg-orange-700"
        >
          {isLast ? '終了して結果を見る' : '次へ'}
        </button>
      </div>
    </div>
  )
}
