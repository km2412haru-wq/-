import { useState } from 'react'
import Setup from './pages/Setup.jsx'
import ExamRunner from './pages/ExamRunner.jsx'
import Result from './pages/Result.jsx'
import { buildExamSet } from './lib/exam.js'

export default function App() {
  // screen: 'setup' | 'exam' | 'result'
  const [screen, setScreen] = useState('setup')
  const [difficultyId, setDifficultyId] = useState(null)
  const [examSet, setExamSet] = useState(null)
  const [answers, setAnswers] = useState(null)

  function handleStart({ examId, difficultyId }) {
    setExamSet(buildExamSet(examId, difficultyId))
    setDifficultyId(difficultyId)
    setScreen('exam')
  }

  function handleFinish(finalAnswers) {
    setAnswers(finalAnswers)
    setScreen('result')
  }

  function handleRestart() {
    setExamSet(null)
    setAnswers(null)
    setDifficultyId(null)
    setScreen('setup')
  }

  if (screen === 'exam' && examSet) {
    return <ExamRunner examSet={examSet} onFinish={handleFinish} />
  }

  if (screen === 'result' && examSet && answers) {
    return (
      <Result
        examSet={examSet}
        answers={answers}
        difficultyId={difficultyId}
        onRestart={handleRestart}
      />
    )
  }

  return <Setup onStart={handleStart} />
}
