import { useMemo, useState } from 'react'
import { DIFFICULTIES, EXAMS } from '../data/exams.js'
import { countAvailable } from '../lib/exam.js'

export default function Setup({ onStart }) {
  const [examId, setExamId] = useState(EXAMS[0].id)
  const [difficultyId, setDifficultyId] = useState(DIFFICULTIES[0].id)

  const exam = EXAMS.find((e) => e.id === examId)
  const available = useMemo(() => countAvailable(examId, difficultyId), [examId, difficultyId])
  const willReduce = available < exam.baseQuestionCount

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-10">
      <header className="mb-8 text-center">
        <div className="mb-2 text-4xl">⏱️</div>
        <h1 className="text-2xl font-bold text-slate-900">AWS資格 模擬試験アプリ</h1>
        <p className="mt-2 text-sm text-slate-600">
          資格と難易度レベルを選んで、10分間で完結する模擬試験を1回受験できます。
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">資格を選択</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXAMS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setExamId(e.id)}
              className={`rounded-xl border-2 p-4 text-left transition ${
                examId === e.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-2xl">{e.icon}</div>
              <div className="mt-1 font-semibold text-slate-900">{e.code}</div>
              <div className="text-xs text-slate-500">{e.name}</div>
              <div className="mt-1 text-xs text-slate-400">
                {e.realExamInfo} ／ 今回は基本{e.baseQuestionCount}問
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">難易度レベルを選択</h2>
        <div className="grid grid-cols-1 gap-3">
          {DIFFICULTIES.map((d) => {
            const count = countAvailable(examId, d.id)
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficultyId(d.id)}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  difficultyId === d.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">{d.label}</span>
                  <span className="text-xs text-slate-500">出題可能: {count}問</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{d.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      <div className="mb-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
        選んだレベルの問題のみが出題され、他レベルの問題は混ざりません。
        {willReduce ? (
          <p className="mt-1 font-medium text-amber-700">
            この組み合わせは問題数が{available}問しかないため、今回は{available}問で実施します（基本
            {exam.baseQuestionCount}問に満たない分を他レベルで埋めることはしません）。
          </p>
        ) : (
          <p className="mt-1">今回は{exam.baseQuestionCount}問・10分間で実施します。</p>
        )}
      </div>

      <button
        type="button"
        disabled={available === 0}
        onClick={() => onStart({ examId, difficultyId })}
        className="w-full rounded-xl bg-orange-600 py-3 text-center font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {available === 0 ? 'この組み合わせの問題はまだありません' : '模擬試験を開始する'}
      </button>
    </div>
  )
}
