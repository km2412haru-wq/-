import { createContext, useContext, useEffect, useState } from 'react'
import { EXAMS, getExam } from '../data/exams.js'

const CURRENT_EXAM_KEY = 'saa-study-current-exam'
const ExamContext = createContext(null)

export function ExamProvider({ children }) {
  const [examId, setExamId] = useState(() => {
    try {
      const saved = localStorage.getItem(CURRENT_EXAM_KEY)
      return EXAMS.some((e) => e.id === saved) ? saved : EXAMS[0].id
    } catch {
      return EXAMS[0].id
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_EXAM_KEY, examId)
    } catch {
      // 保存できない環境では無視
    }
  }, [examId])

  const exam = getExam(examId)

  return (
    <ExamContext.Provider value={{ examId, setExamId, exam }}>{children}</ExamContext.Provider>
  )
}

export function useExam() {
  const ctx = useContext(ExamContext)
  if (!ctx) throw new Error('useExam must be used within ExamProvider')
  return ctx
}
