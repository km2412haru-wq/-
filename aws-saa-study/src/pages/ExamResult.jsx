import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import questions from '../data/questions.json'
import { getExam, domainName } from '../data/exams.js'
import { getExamHistory } from '../lib/storage.js'
import StatBar from '../components/StatBar.jsx'

export default function ExamResult() {
  const { examId: examResultId } = useParams()
  const record = useMemo(
    () => getExamHistory().find((e) => e.id === examResultId),
    [examResultId],
  )

  if (!record) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        試験結果が見つかりませんでした。
        <div>
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    )
  }

  const exam = getExam(record.examId)
  const pct = Math.round((record.score / record.total) * 100)
  const wrongQuestions = record.wrongIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">
          {exam.icon} {exam.code} ・ {new Date(record.date).toLocaleString('ja-JP')} 実施
        </p>
        <p className="mt-2 text-4xl font-bold text-blue-600">
          {record.score} / {record.total}
        </p>
        <p className="text-slate-600">正答率 {pct}%</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">ドメイン別正答率</h2>
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          {exam.domains.map((d) => {
            const b = record.domainBreakdown[d.id] ?? { correct: 0, total: 0 }
            return (
              <StatBar
                key={d.id}
                label={`ドメイン${d.id}: ${d.name}`}
                value={b.correct}
                total={b.total}
                color={d.color}
                suffix="問"
              />
            )
          })}
        </div>
      </section>

      {wrongQuestions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">間違えた問題（{wrongQuestions.length}問）</h2>
          <div className="space-y-3">
            {wrongQuestions.map((q) => (
              <div key={q.id} className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
                <p className="mb-1 text-xs font-semibold text-rose-500">
                  ドメイン{q.domain}: {domainName(record.examId, q.domain)}
                </p>
                <p className="mb-2 text-sm font-medium text-slate-900">{q.question}</p>
                <p className="mb-1 text-sm text-emerald-700">
                  正解: {String.fromCharCode(65 + q.correctIndex)}. {q.choices[q.correctIndex]}
                </p>
                <p className="text-sm text-slate-600">{q.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3">
        <Link
          to="/exam"
          className="flex-1 rounded-md bg-blue-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-700"
        >
          もう一度受験する
        </Link>
        <Link
          to="/"
          className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-center font-medium hover:bg-slate-50"
        >
          ダッシュボードへ
        </Link>
      </div>
    </div>
  )
}
