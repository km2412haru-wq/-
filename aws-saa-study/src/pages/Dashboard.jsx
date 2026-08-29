import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import summaries from '../data/summaries.json'
import questions from '../data/questions.json'
import { useExam } from '../context/ExamContext.jsx'
import StatBar from '../components/StatBar.jsx'
import {
  getReadSummaries,
  getQuizStats,
  getExamHistory,
  getReviewList,
  resetAllData,
} from '../lib/storage.js'

export default function Dashboard() {
  const { examId, exam } = useExam()
  const [tick, setTick] = useState(0) // リセット後に再描画するためのダミーstate
  const readSummaries = useMemo(() => getReadSummaries(), [tick])
  const quizStats = useMemo(() => getQuizStats(), [tick])
  const examHistory = useMemo(
    () => getExamHistory().filter((e) => e.examId === examId),
    [tick, examId],
  )
  const reviewList = useMemo(() => getReviewList(), [tick])

  const examQuestionIds = useMemo(
    () => new Set(questions.filter((q) => q.exam === examId).map((q) => q.id)),
    [examId],
  )
  const dueReviewCount = Object.entries(reviewList).filter(
    ([id, v]) => examQuestionIds.has(id) && v.nextReviewAt <= Date.now(),
  ).length

  const questionsByDomain = useMemo(() => {
    const map = {}
    for (const d of exam.domains) {
      map[d.id] = questions.filter((q) => q.exam === examId && q.domain === d.id)
    }
    return map
  }, [exam, examId])

  const summariesByDomain = useMemo(() => {
    const map = {}
    for (const d of exam.domains) {
      map[d.id] = summaries.filter((s) => s.exam === examId && s.domain === d.id)
    }
    return map
  }, [exam, examId])

  function domainQuizAccuracy(domainId) {
    const qs = questionsByDomain[domainId]
    let correct = 0
    let seen = 0
    for (const q of qs) {
      const stat = quizStats[q.id]
      if (stat) {
        correct += stat.correct
        seen += stat.seen
      }
    }
    return { correct, seen }
  }

  function domainReadCount(domainId) {
    const list = summariesByDomain[domainId]
    const read = list.filter((s) => readSummaries[`${examId}-${domainId}-${s.service}`]).length
    return { read, total: list.length }
  }

  function handleReset() {
    if (confirm('学習の進捗・クイズ履歴・模擬試験の記録をすべて削除します。よろしいですか？')) {
      resetAllData()
      setTick((t) => t + 1)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">進捗ダッシュボード</h1>
          <p className="text-sm text-slate-500">
            {exam.icon} {exam.name}（{exam.code}）
          </p>
        </div>
        <button
          onClick={handleReset}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
        >
          進捗をリセット
        </button>
      </div>

      {dueReviewCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            復習期限が来た問題が <span className="font-bold">{dueReviewCount}問</span> あります。
          </p>
          <Link
            to="/quiz?mode=review"
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            復習を始める
          </Link>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">① サマリー読了率（ドメイン別）</h2>
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          {exam.domains.map((d) => {
            const { read, total } = domainReadCount(d.id)
            return (
              <StatBar
                key={d.id}
                label={`ドメイン${d.id}: ${d.name}`}
                value={read}
                total={total}
                color={d.color}
                suffix="件"
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">② クイズ正答率（ドメイン別）</h2>
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          {exam.domains.map((d) => {
            const { correct, seen } = domainQuizAccuracy(d.id)
            return (
              <StatBar
                key={d.id}
                label={`ドメイン${d.id}: ${d.name}`}
                value={correct}
                total={seen}
                color={d.color}
                suffix="問"
              />
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          ※ 「seen」は回答済みの問題数（同じ問題を複数回解いた場合は加算されます）
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">③ 模擬試験の受験履歴</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          {examHistory.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">まだ模擬試験を受験していません。</p>
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">日時</th>
                  <th className="px-4 py-2 font-medium">スコア</th>
                  <th className="px-4 py-2 font-medium">正答率</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...examHistory].reverse().map((record) => (
                  <tr key={record.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {new Date(record.date).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-2">
                      {record.score} / {record.total}
                    </td>
                    <td className="px-4 py-2">
                      {Math.round((record.score / record.total) * 100)}%
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        to={`/exam/result/${record.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
