import { Amplify } from 'aws-amplify'
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { useCallback, useEffect, useState } from 'react'
import { isMock } from './api'

// amplify_outputs.json は `ampx sandbox` / デプロイで生成される。無ければバックエンド未接続
const outputs = import.meta.glob('../amplify_outputs.json', { eager: true, import: 'default' })
const config = Object.values(outputs)[0]
if (config) Amplify.configure(config as Parameters<typeof Amplify.configure>[0])
export const backendConfigured = isMock || !!config

const MOCK_AUTH = 'faction-bbs-mock-auth'

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(false)

  const refresh = useCallback(async () => {
    if (isMock) {
      try {
        setLoggedIn(localStorage.getItem(MOCK_AUTH) === '1')
      } catch {
        setLoggedIn(false)
      }
      return
    }
    try {
      await getCurrentUser()
      setLoggedIn(true)
    } catch {
      setLoggedIn(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    if (isMock) return
    return Hub.listen('auth', () => void refresh())
  }, [refresh])

  const signOut = useCallback(async () => {
    if (isMock) {
      try {
        localStorage.removeItem(MOCK_AUTH)
      } catch {
        /* noop */
      }
    } else {
      await amplifySignOut()
    }
    await refresh()
  }, [refresh])

  const mockSignIn = useCallback(() => {
    try {
      localStorage.setItem(MOCK_AUTH, '1')
    } catch {
      /* noop */
    }
    void refresh()
  }, [refresh])

  return { loggedIn, signOut, mockSignIn, refresh }
}

function Done({ onDone }: { onDone: () => void }) {
  useEffect(onDone, [onDone])
  return null
}

/** メール+パスワードのログイン/新規登録（Cognito）。完了したら onDone */
export function LoginDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="ログイン">
      <div className="dialog">
        <button className="ghost close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <Authenticator loginMechanisms={['email']} signUpAttributes={[]}>
          {() => <Done onDone={onDone} />}
        </Authenticator>
      </div>
    </div>
  )
}
