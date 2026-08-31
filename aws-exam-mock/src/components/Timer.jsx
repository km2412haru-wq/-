import { useEffect, useRef, useState } from 'react'

// durationSec からのカウントダウンを表示するタイマー。0に達すると onExpire を1回だけ呼ぶ。
export default function Timer({ durationSec, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(durationSec)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current()
      }
      return
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  const clamped = Math.max(secondsLeft, 0)
  const mm = String(Math.floor(clamped / 60)).padStart(2, '0')
  const ss = String(clamped % 60).padStart(2, '0')
  const urgent = clamped <= 60

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-lg font-bold tabular-nums ${
        urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-800'
      }`}
      role="timer"
      aria-live="polite"
    >
      <span aria-hidden="true">⏱</span>
      {mm}:{ss}
    </div>
  )
}
