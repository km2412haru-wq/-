import { generateClient } from 'aws-amplify/api'
import type { Schema } from '../amplify/data/resource'
import type { Api, ApiResult } from './api'
import { decodeResult } from './decode'

const client = generateClient<Schema>()

type Mode = 'identityPool' | 'userPool'

/** AppSync の AWSJSON（JSON文字列）を ApiResult に直す。ネットワーク/認可エラーは code に落とす */
async function call<T>(p: Promise<{ data: unknown; errors?: readonly { message: string }[] }>): Promise<ApiResult<T>> {
  try {
    const { data, errors } = await p
    if (errors?.length || data == null) {
      const msg = errors?.[0]?.message ?? 'empty response'
      console.error('[api] GraphQL error', errors)
      return { ok: false, code: /Unauthorized|not authorized/i.test(msg) ? 'UNAUTHORIZED' : 'GRAPHQL_ERROR', message: msg }
    }
    return decodeResult<T>(data)
  } catch (e) {
    console.error('[api] request failed', e)
    return { ok: false, code: 'REQUEST_FAILED', message: e instanceof Error ? e.message : String(e) }
  }
}

export const amplifyApi: Api = {
  getCurrentBattle: () => call(client.queries.getCurrentBattle({ authMode: 'identityPool' })),
  getMyStatus: (deviceId, loggedIn) => {
    const mode: Mode = loggedIn ? 'userPool' : 'identityPool'
    return call(client.queries.getMyStatus({ deviceId }, { authMode: mode }))
  },
  listPosts: (side, afterPostNo) => call(client.queries.listPosts({ side, afterPostNo }, { authMode: 'identityPool' })),
  castSpectatorVote: (deviceId, side) =>
    call(client.mutations.castSpectatorVote({ deviceId, side }, { authMode: 'identityPool' })),
  joinBattle: (side, deviceId) => call(client.mutations.joinBattle({ side, deviceId }, { authMode: 'userPool' })),
  createPost: (side, body) => call(client.mutations.createPost({ side, body }, { authMode: 'userPool' })),
}
