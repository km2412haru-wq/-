import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import summaries from '../data/summaries.json'
import { DOMAINS, domainColor } from '../data/domains.js'
import { isSummaryRead, setSummaryRead } from '../lib/storage.js'

export default function Study() {
  const { domain, service } = useParams()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const byDomain = useMemo(() => {
    const map = {}
    for (const d of DOMAINS) map[d.id] = summaries.filter((s) => s.domain === d.id)
    return map
  }, [])

  const current =
    summaries.find((s) => String(s.domain) === domain && s.service === service) ?? null

  function selectService(d, s) {
    navigate(`/study/${d}/${encodeURIComponent(s)}`)
    setSidebarOpen(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <button
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium lg:hidden"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        {sidebarOpen ? '目次を閉じる' : '目次を開く ▾'}
      </button>

      <aside
        className={`space-y-4 rounded-lg border border-slate-200 bg-white p-4 lg:block ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <h2 className="text-sm font-bold text-slate-500">① 体系的インプット</h2>
        {DOMAINS.map((d) => (
          <div key={d.id}>
            <p className="mb-1 text-xs font-semibold" style={{ color: d.color }}>
              ドメイン{d.id}（{d.weight}%）: {d.name}
            </p>
            <ul className="space-y-0.5">
              {byDomain[d.id].map((s) => {
                const active = String(d.id) === domain && s.service === service
                const read = isSummaryRead(d.id, s.service)
                return (
                  <li key={s.service}>
                    <button
                      onClick={() => selectService(d.id, s.service)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        active ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={read ? 'text-emerald-500' : 'text-slate-300'}>
                        {read ? '✓' : '○'}
                      </span>
                      {s.service}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </aside>

      <div>
        {!current ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            目次からサービスを選んで学習を始めましょう。
          </div>
        ) : (
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: domainColor(current.domain) }}>
                  ドメイン{current.domain}: {DOMAINS.find((d) => d.id === current.domain)?.name}
                </p>
                <h1 className="text-2xl font-bold">{current.service}</h1>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={isSummaryRead(current.domain, current.service)}
                  onChange={(e) => {
                    setSummaryRead(current.domain, current.service, e.target.checked)
                    setTick((t) => t + 1)
                  }}
                />
                読んだ
              </label>
            </div>

            <p className="mb-5 text-slate-700">{current.overview}</p>

            <h3 className="mb-2 font-semibold text-slate-800">主要な機能・特徴</h3>
            <ul className="mb-5 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {current.keyPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>

            <h3 className="mb-2 font-semibold text-slate-800">🎯 試験で狙われやすいポイント</h3>
            <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">{current.examTips}</p>
          </article>
        )}
      </div>
    </div>
  )
}
