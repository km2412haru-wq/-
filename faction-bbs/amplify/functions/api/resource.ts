import { defineFunction, secret } from '@aws-amplify/backend'

export const api = defineFunction({
  name: 'faction-bbs-api',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 15,
  memoryMB: 256,
  // data スタックに置くことで、テーブル側スタックとの循環参照を避ける
  resourceGroupName: 'data',
  environment: {
    // 端末ID・匿名IDのHMAC鍵: `npx ampx sandbox secret set HMAC_SECRET`
    HMAC_SECRET: secret('HMAC_SECRET'),
  },
})
