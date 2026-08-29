import { NavLink, Outlet } from 'react-router-dom'
import { EXAMS } from '../data/exams.js'
import { useExam } from '../context/ExamContext.jsx'

const navItems = [
  { to: '/', label: 'ダッシュボード', end: true },
  { to: '/study', label: '① 学習' },
  { to: '/quiz', label: '② クイズ' },
  { to: '/exam', label: '③ 模擬試験' },
]

export default function Layout() {
  const { examId, setExamId, exam } = useExam()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xl">{exam.icon}</span>
            <span className="font-bold tracking-tight">AWS認定 学習ツール</span>
          </div>
          <nav className="flex w-full gap-1 overflow-x-auto text-sm sm:w-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <label htmlFor="exam-switcher" className="text-xs font-medium text-slate-500">
              学習する資格:
            </label>
            <select
              id="exam-switcher"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {EXAMS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.icon} {e.shortLabel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-center text-xs text-slate-400">
        個人学習用ツール（サンプルデータ）・記載の料金/制限値は「要確認」の記載があるものは未検証です
      </footer>
    </div>
  )
}
