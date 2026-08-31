// 対応する資格試験のメタデータ（ドメイン構成・出題比率・ミニ模試の設定など）。
// summaries.json / questions.json の各エントリはここで定義した id を "exam" フィールドに持つ。
export const EXAMS = [
  {
    id: 'SAA',
    code: 'SAA-C03',
    icon: '📘',
    name: 'AWS Certified Solutions Architect – Associate',
    shortLabel: 'SAA-C03: ソリューションアーキテクト',
    realExamInfo: '本番は65問130分',
    // 10分のミニ模試の問題数。本番の1問あたりの持ち時間（130分 / 65問 ≒ 2分/問）から逆算。
    examLength: 5,
    examDurationSec: 10 * 60,
    domains: [
      { id: 1, name: 'セキュアなアーキテクチャの設計', weight: 30, color: '#2563eb' },
      { id: 2, name: 'レジリエントアーキテクチャの設計', weight: 26, color: '#059669' },
      { id: 3, name: '高性能アーキテクチャの設計', weight: 24, color: '#d97706' },
      { id: 4, name: 'コスト最適化アーキテクチャの設計', weight: 20, color: '#7c3aed' },
    ],
  },
  {
    id: 'CLF',
    code: 'CLF-C02',
    icon: '☁️',
    name: 'AWS Certified Cloud Practitioner',
    shortLabel: 'CLF-C02: クラウドプラクティショナー',
    realExamInfo: '本番は65問90分',
    // 10分のミニ模試の問題数。本番の1問あたりの持ち時間（90分 / 65問 ≒ 1.4分/問）から逆算。
    examLength: 7,
    examDurationSec: 10 * 60,
    domains: [
      { id: 1, name: 'クラウドの概念', weight: 24, color: '#2563eb' },
      { id: 2, name: 'セキュリティとコンプライアンス', weight: 30, color: '#059669' },
      { id: 3, name: 'クラウドテクノロジーとサービス', weight: 34, color: '#d97706' },
      { id: 4, name: '請求・料金・サポート', weight: 12, color: '#7c3aed' },
    ],
  },
]

export function getExam(examId) {
  return EXAMS.find((e) => e.id === examId) ?? EXAMS[0]
}

export function domainName(examId, domainId) {
  const exam = getExam(examId)
  return exam.domains.find((d) => d.id === Number(domainId))?.name ?? `ドメイン${domainId}`
}

export function domainColor(examId, domainId) {
  const exam = getExam(examId)
  return exam.domains.find((d) => d.id === Number(domainId))?.color ?? '#64748b'
}
