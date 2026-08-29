// SAA-C03 の4ドメイン定義（出題比率は試験ガイドに基づく）
export const DOMAINS = [
  { id: 1, name: 'セキュアなアーキテクチャの設計', weight: 30, color: '#2563eb' },
  { id: 2, name: 'レジリエントアーキテクチャの設計', weight: 26, color: '#059669' },
  { id: 3, name: '高性能アーキテクチャの設計', weight: 24, color: '#d97706' },
  { id: 4, name: 'コスト最適化アーキテクチャの設計', weight: 20, color: '#7c3aed' },
]

export function domainName(id) {
  return DOMAINS.find((d) => d.id === Number(id))?.name ?? `ドメイン${id}`
}

export function domainColor(id) {
  return DOMAINS.find((d) => d.id === Number(id))?.color ?? '#64748b'
}
