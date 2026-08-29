import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pickExamQuestions } from '../lib/exam.js'
import { saveExamResult } from '../lib/storage.js'
import { useExam } from '../context/ExamContext.jsx'

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Exam() {
  const { examId, exam } = useExam()
  const navigate = useNavigate()
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([]) // index === correctIndex or null
  const [current, setCurrent] = useState(0)
  const [remaining, setRemaining] = useState(exam.examDurationSec)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [started])

  useEffect(() => {
    if (started && remaining === 0) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, started])

  function startExam() {
    const qs = pickExamQuestions(examId)
    setQuestions(qs)
    setAnswers(new Array(qs.length).fill(null))
    setCurrent(0)
    setRemaining(exam.examDurationSec)
    setStarted(true)
  }

  function selectAnswer(choiceIndex) {
    setAnswers((prev) => {
      const next = [...prev]
      next[current] = choiceIndex
      return next
    })
  }

  function handleSubmit() {
    clearInterval(timerRef.current)
    let score = 0
    const domainBreakdown = {}
    for (const d of exam.domains) domainBreakdown[d.id] = { correct: 0, total: 0 }
    const wrongIds = []

    questions.forEach((q, i) => {
      domainBreakdown[q.domain].total += 1
      if (answers[i] === q.correctIndex) {
        score += 1
        domainBreakdown[q.domain].correct += 1
      } else {
        wrongIds.push(q.id)
      }
    })

    const result = {
      examId,
      score,
      total: questions.length,
      domainBreakdown,
      wrongIds,
      answers,
      questionIds: questions.map((q) => q.id),
    }
    saveExamResult(result)
    // 保存直後のexamHistoryから最新のidを取得してリザルト画面へ
    const savedExamId = JSON.parse(localStorage.getItem('saa-study-data-v2')).examHistory.at(-1).id
    navigate(`/exam/result/${savedExamId}`)
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-bold">
          ③ 模擬試験（ミニ版）— {exam.code}
        </h1>
        <p className="text-slate-600">
          {exam.examLength}問・{exam.examDurationSec / 60}分のミニ模擬試験です。
          <br />
          {exam.realExamInfo}ですが、まずは短縮版で腕試ししましょう。
        </p>
        <ul className="mx-auto max-w-sm list-disc space-y-1 pl-5 text-left text-sm text-slate-500">
          <li>4ドメインからバランスよく出題されます</li>
          <li>試験中は解説を表示しません</li>
          <li>終了後にまとめて採点し、ドメイン別正答率を確認できます</li>
        </ul>
        <button
          onClick={startExam}
          className="rounded-md bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          模擬試験を開始する
        </button>
      </div>
    )
  }

  const q = questions[current]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-sm font-medium text-slate-600">
          問題 {current + 1} / {questions.length}
        </span>
        <span
          className={`font-mono text-lg font-bold ${
            remaining <= 60 ? 'text-rose-600' : 'text-slate-800'
          }`}
        >
          ⏱ {formatTime(remaining)}
        </span>
      </div>

      {/* 問題ナビゲーター */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-8 w-8 rounded-md text-xs font-semibold ${
              i === current
                ? 'bg-blue-600 text-white'
                : answers[i] !== null
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="mb-5 whitespace-pre-wrap text-base font-medium text-slate-900">
          {q.question}
        </p>
        <div className="space-y-2">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => selectAnswer(i)}
              className={`block w-full rounded-md border px-4 py-2.5 text-left text-sm transition-colors ${
                answers[current] === i
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
              {choice}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
          className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 font-medium disabled:opacity-40"
        >
          前の問題
        </button>
        {current + 1 < questions.length ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 font-medium"
          >
            次の問題
          </button>
        ) : null}
        <button
          onClick={handleSubmit}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          採点する
        </button>
      </div>
    </div>
  )
}
