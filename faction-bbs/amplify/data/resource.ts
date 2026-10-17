import { a, defineData, type ClientSchema } from '@aws-amplify/backend'
import { api } from '../functions/api/resource'

/**
 * データはすべて api Lambda 経由で読み書きする（Amplify Data のモデルは使わない）。
 * - 閲覧・観客票: ゲスト(未ログイン)とログイン済みの両方
 * - 参戦・書き込み: ログイン済みのみ
 * 返り値は { ok, data | code } のJSON文字列。
 */

const schema = a.schema({
  getCurrentBattle: a.query().returns(a.json()).handler(a.handler.function(api)).authorization((allow) => [allow.guest(), allow.authenticated()]),

  getMyStatus: a
    .query()
    .arguments({ deviceId: a.string() })
    .returns(a.json())
    .handler(a.handler.function(api))
    .authorization((allow) => [allow.guest(), allow.authenticated()]),

  listPosts: a
    .query()
    .arguments({ side: a.string().required(), afterPostNo: a.integer() })
    .returns(a.json())
    .handler(a.handler.function(api))
    .authorization((allow) => [allow.guest(), allow.authenticated()]),

  castSpectatorVote: a
    .mutation()
    .arguments({ deviceId: a.string().required(), side: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function(api))
    .authorization((allow) => [allow.guest()]),

  joinBattle: a
    .mutation()
    .arguments({ side: a.string().required(), deviceId: a.string() })
    .returns(a.json())
    .handler(a.handler.function(api))
    .authorization((allow) => [allow.authenticated()]),

  createPost: a
    .mutation()
    .arguments({ side: a.string().required(), body: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function(api))
    .authorization((allow) => [allow.authenticated()]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'identityPool' },
})
