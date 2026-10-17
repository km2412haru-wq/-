import type { AppSyncResolverEvent } from 'aws-lambda'
import { createDynamoRepo } from './dynamoRepo'
import { ApiError, createService } from './service'

const env = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`missing env ${k}`)
  return v
}

const service = createService({
  repo: createDynamoRepo({
    battles: env('TABLE_BATTLES'),
    posts: env('TABLE_POSTS'),
    events: env('TABLE_EVENTS'),
    guards: env('TABLE_GUARDS'),
  }),
  secret: env('HMAC_SECRET'),
  now: () => Date.now(),
})

type Args = Record<string, unknown>

/** ユーザー認証(userPool)のときだけ sub が入る。ゲスト(IAM)では undefined */
function userIdOf(event: AppSyncResolverEvent<Args>): string | undefined {
  const id = event.identity as { sub?: string } | null | undefined
  return id && 'sub' in id ? id.sub : undefined
}

/** エラーは例外ではなく { ok:false, code } で返す（クライアントが文言を出し分けるため） */
export const handler = async (event: AppSyncResolverEvent<Args>): Promise<string> => {
  const a = event.arguments
  const userId = userIdOf(event)
  try {
    let data: unknown
    switch (event.info.fieldName) {
      case 'getCurrentBattle':
        data = await service.getCurrentBattle()
        break
      case 'getMyStatus':
        data = await service.getMyStatus({ userId, deviceId: a.deviceId as string | undefined })
        break
      case 'castSpectatorVote':
        data = await service.castSpectatorVote({ deviceId: a.deviceId, side: a.side })
        break
      case 'joinBattle':
        data = await service.joinBattle({ userId, side: a.side, deviceId: a.deviceId })
        break
      case 'createPost':
        data = await service.createPost({ userId, side: a.side, body: a.body })
        break
      case 'listPosts':
        data = await service.listPosts({ side: a.side, afterPostNo: a.afterPostNo })
        break
      default:
        throw new ApiError('INVALID_INPUT')
    }
    return JSON.stringify({ ok: true, data })
  } catch (e) {
    if (e instanceof ApiError) return JSON.stringify({ ok: false, code: e.code, detail: e.detail })
    console.error(e)
    throw e
  }
}
