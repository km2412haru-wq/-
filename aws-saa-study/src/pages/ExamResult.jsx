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

  // 出題順に「自分の解答・正解・解説」を並べる（問題データが差し替わっていても
  // questionIdsから引けない問題はスキップする）
  const reviewItems = record.questionIds
    .map((id, i) => {
      const q = questions.find((q) => q.id === id)
      if (!q) return null
      const selectedIndex = record.answers[i] ?? null
      return {
        question: q,
        selectedIndex,
        isCorrect: selectedIndex === q.correctIndex,
      }
    })
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

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="mb-1 font-semibold">📊 合格ラインの目安について</p>
        <p>
          AWS認定試験の合否は、素点の正答率ではなく1000点満点にスケーリングされたスコアで判定されます。この模擬試験の正答率はあくまで簡易的な目安としてご確認ください。現行の合格ラインの具体的な数値は、AWS公式サイトの該当資格の試験ガイドで最新情報を確認してください。
        </p>
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

      <section>
        <h2 className="mb-3 text-lg font-semibold">問題ごとの振り返り</h2>
        <div className="space-y-3">
          {reviewItems.map(({ question: q, selectedIndex, isCorrect }, i) => (
            <div
              key={q.id}
              className={`rounded-lg border p-4 ${
                isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">
                  問題{i + 1} ・ ドメイン{q.domain}: {domainName(record.examId, q.domain)}
                </p>
                <span
                  className={`text-xs font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {isCorrect ? '✅ 正解' : '❌ 不正解'}
                </span>
              </div>
              <p className="mb-2 text-sm font-medium text-slate-900">{q.question}</p>
              <p className="mb-1 text-sm text-slate-700">
                あなたの解答:{' '}
                {selectedIndex === null ? (
                  <span className="font-semibold text-slate-500">未回答</span>
                ) : (
                  <span className={isCorrect ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>
                    {String.fromCharCode(65 + selectedIndex)}. {q.choices[selectedIndex]}
                  </span>
                )}
              </p>
              {!isCorrect && (
                <p className="mb-1 text-sm text-emerald-700">
                  正解: {String.fromCharCode(65 + q.correctIndex)}. {q.choices[q.correctIndex]}
                </p>
              )}
              <p className="text-sm text-slate-600">{q.explanation}</p>
            </div>
          ))}
        </div>
      </section>

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
