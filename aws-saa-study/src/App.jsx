import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Study from './pages/Study.jsx'
import Quiz from './pages/Quiz.jsx'
import Exam from './pages/Exam.jsx'
import ExamResult from './pages/ExamResult.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/study" element={<Study />} />
        <Route path="/study/:domain/:service" element={<Study />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/exam/result/:examId" element={<ExamResult />} />
      </Route>
    </Routes>
  )
}
