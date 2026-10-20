import { useCallback, useEffect, useRef, useState } from 'react'
import { gameConfig } from '../shared/gameConfig'
import { countChars, validatePostBody } from '../shared/textRules'
import type { PostItem, Side } from '../shared/types'
import { api, errorMessage, isMock, type BattleView, type MyStatus } from './api'
import { backendConfigured, LoginDialog, useAuth } from './auth'

const POLL_MS = 10_000
const DEVICE_KEY = 'faction-bbs-device'

function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id || id.length < 16) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    // localStorage が使えない環境では、リロードごとに別端末扱い（弱い制限なので許容）
    return crypto.randomUUID()
  }
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '終了'
  const h = Math.floor(ms / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  return h >= 24 ? `あと${Math.floor(h / 24)}日${h % 24}時間` : `あと${h}時間${m}分`
}

export function App() {
  const auth = useAuth()
  const deviceId = useRef(getDeviceId()).current
  const [battle, setBattle] = useState<BattleView | null | undefined>(undefined)
  const [status, setStatus] = useState<MyStatus>({ member: null, spectatorVote: null })
  const [view, setView] = useState<Side>('A')
  const [posts, setPosts] = useState<Record<Side, PostItem[]>>({ A: [], B: [] })
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const skew = useRef(0)

  const refresh = useCallback(async () => {
    const b = await api.getCurrentBattle()
    if (!b.ok) return setLoadError(errorMessage(b))
    setLoadError(null)
    setBattle(b.data)
    if (!b.data) return
    skew.current = b.data.serverNow - Date.now()
    const [st, a, bb] = await Promise.all([
      api.getMyStatus(deviceId, auth.loggedIn),
      fetchAll('A'),
      fetchAll('B'),
    ])
    if (st.ok) setStatus(st.data)
    setPosts({ A: a, B: bb })
  }, [auth.loggedIn, deviceId])

  useEffect(() => {
    if (!backendConfigured) return
    void refresh()
    const id = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // 参戦後は自陣営のスレを開く
  useEffect(() => {
    if (status.member) setView(status.member.side)
  }, [status.member])

  if (!backendConfigured) {
    return (
      <main className="page">
        <h1>派閥決戦BBS</h1>
        <p className="card">
          バックエンドに接続されていません。<code>npx ampx sandbox</code> で <code>amplify_outputs.json</code>{' '}
          を生成するか、<code>VITE_MOCK=1 npm run dev</code> でモック表示してください。
        </p>
      </main>
    )
  }
  if (loadError && battle === undefined) {
    return (
      <main className="page">
        <h1>派閥決戦BBS</h1>
        <p className="notice" role="alert">
          読み込みに失敗しました。{loadError}
        </p>
        <button onClick={() => void refresh()}>再読み込み</button>
      </main>
    )
  }
  if (battle === undefined) return <main className="page">読み込み中…</main>
  if (battle === null) {
    return (
      <main className="page">
        <h1>派閥決戦BBS</h1>
        <p className="card">いま開催中の決戦はありません。次回をお待ちください。</p>
      </main>
    )
  }

  const b = battle
  const now = clock + skew.current
  const accepting = b.accepting && now < b.endAt
  const label = (s: Side) => b.sideLabels[s]
  const member = status.member
  const readOnly = !member || member.side !== view

  async function vote(side: Side) {
    const r = await api.castSpectatorVote(deviceId, side)
    setNotice(r.ok ? null : errorMessage(r))
    if (r.ok) setStatus((s) => ({ ...s, spectatorVote: r.data.side }))
  }
  async function join(side: Side) {
    if (!window.confirm(`「${label(side)}」で参戦します。陣営は変更できません。よろしいですか？`)) return
    const r = await api.joinBattle(side, deviceId)
    setNotice(r.ok ? null : errorMessage(r))
    if (r.ok) await refresh()
  }

  return (
    <main className="page">
      <header className="top">
        <div>
          <h1>{b.theme}</h1>
          <p className="muted">
            {accepting ? formatRemaining(b.endAt - now) : '受付終了'}・自分の陣営のスレにのみ書き込めます
          </p>
        </div>
        <div className="account">
          {auth.loggedIn ? (
            <button className="ghost" onClick={() => void auth.signOut()}>
              ログアウト
            </button>
          ) : (
            <button
              className="ghost"
              onClick={() => (isMock ? auth.mockSignIn() : setShowLogin(true))}
            >
              ログイン / 新規登録
            </button>
          )}
        </div>
      </header>

      {notice && (
        <p className="notice" role="alert">
          {notice}
        </p>
      )}

      {!auth.loggedIn && (
        <section className="card" aria-label="観客投票">
          <h2>どちらを応援しますか？（ログイン不要）</h2>
          <div className="duo">
            {(['A', 'B'] as const).map((s) => (
              <button
                key={s}
                className={`side side-${s}`}
                aria-pressed={status.spectatorVote === s}
                disabled={!accepting}
                onClick={() => void vote(s)}
              >
                {label(s)}
                {status.spectatorVote === s && <small>投票済み</small>}
              </button>
            ))}
          </div>
          <p className="muted">観客票の重みは小さめです。書き込みや鞍替えにはログインして参戦してください。</p>
        </section>
      )}

      {auth.loggedIn && !member && (
        <section className="card" aria-label="参戦">
          <h2>陣営を選んで参戦</h2>
          <div className="duo">
            {(['A', 'B'] as const).map((s) => (
              <button key={s} className={`side side-${s}`} disabled={!accepting} onClick={() => void join(s)}>
                {label(s)}で参戦
              </button>
            ))}
          </div>
          <p className="muted">参戦後は陣営を変えられません（鞍替えは期間中1回、説得されたレスの指名が必要です）。</p>
        </section>
      )}

      {member && (
        <p className="you">
          あなた：<strong className={`tag tag-${member.side}`}>{label(member.side)}</strong> / {member.alias}
        </p>
      )}

      <nav className="tabs" aria-label="スレッド">
        {(['A', 'B'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={view === s} className={`tab tab-${s}`} onClick={() => setView(s)}>
            {label(s)}（{posts[s].length}）
          </button>
        ))}
      </nav>

      <section aria-label={`${label(view)}のスレ`}>
        {readOnly && member && <p className="muted">相手陣営のスレは閲覧のみです。</p>}
        <ol className="posts">
          {posts[view].length === 0 && <li className="muted empty">まだ書き込みがありません</li>}
          {posts[view].map((p) => (
            <li key={p.postNo} className={`post post-${p.side}`}>
              <div className="meta">
                <span>&gt;&gt;{p.postNo}</span>
                <span>{p.authorAlias}</span>
                <time>{new Date(p.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
              </div>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {member && !readOnly && accepting && (
        <PostForm
          side={member.side}
          onPosted={async () => {
            setNotice(null)
            await refresh()
          }}
          onError={setNotice}
        />
      )}

      {showLogin && (
        <LoginDialog
          onClose={() => setShowLogin(false)}
          onDone={() => {
            setShowLogin(false)
            void auth.refresh()
          }}
        />
      )}
    </main>
  )
}

async function fetchAll(side: Side): Promise<PostItem[]> {
  const all: PostItem[] = []
  let after = 0
  for (let i = 0; i < 20; i++) {
    const r = await api.listPosts(side, after)
    if (!r.ok) break
    all.push(...r.data.posts)
    if (r.data.next == null) break
    after = r.data.next
  }
  return all
}

function PostForm(props: { side: Side; onPosted: () => Promise<void>; onError: (m: string | null) => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const max = gameConfig.limits.postMaxChars
  const n = countChars(body)
  const local = body ? validatePostBody(body) : null
  const localMsg =
    local?.code === 'URL' ? 'URL（リンク）は書き込めません' : local?.code === 'NG_WORD' ? `使えない言葉：「${local.word}」` : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || local || !body.trim()) return
    setBusy(true)
    const r = await api.createPost(props.side, body)
    setBusy(false)
    if (r.ok) {
      setBody('')
      await props.onPosted()
    } else {
      props.onError(errorMessage(r))
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <label htmlFor="body" className="muted">
        書き込み（{max}字まで・URL/画像/DM不可・投稿後の編集/削除はできません）
      </label>
      <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="あなたの主張を書く" />
      <div className="row">
        <span className={n > max ? 'over' : 'muted'}>
          {n}/{max}
        </span>
        {localMsg && <span className="over">{localMsg}</span>}
        <button type="submit" className="primary" disabled={busy || !!local || !body.trim()}>
          {busy ? '送信中…' : '書き込む'}
        </button>
      </div>
    </form>
  )
}
