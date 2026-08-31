// 対応する資格試験のメタデータ。questions.json の各エントリはここで定義した id を
// "exam" フィールドに、1〜4のドメイン番号を "domain" フィールドに持つ。
export const EXAM_DURATION_SEC = 10 * 60 // 難易度・資格によらず一律10分

export const EXAMS = [
  {
    id: 'CLF',
    code: 'CLF-C02',
    icon: '☁️',
    name: 'AWS Certified Cloud Practitioner',
    shortLabel: 'CLF-C02: クラウドプラクティショナー',
    realExamInfo: '本番は65問90分',
    // 本番の1問あたりの持ち時間（90分/65問 ≒ 83秒/問）から逆算した、10分間で解ける目安の問題数
    baseQuestionCount: 7,
    passingScore: 700,
    domains: [
      { id: 1, name: 'クラウドの概念', weight: 24, color: '#2563eb' },
      { id: 2, name: 'セキュリティとコンプライアンス', weight: 30, color: '#059669' },
      { id: 3, name: 'クラウドテクノロジーとサービス', weight: 34, color: '#d97706' },
      { id: 4, name: '請求・料金・サポート', weight: 12, color: '#7c3aed' },
    ],
  },
  {
    id: 'SAA',
    code: 'SAA-C03',
    icon: '📘',
    name: 'AWS Certified Solutions Architect – Associate',
    shortLabel: 'SAA-C03: ソリューションアーキテクト',
    realExamInfo: '本番は65問130分',
    // 本番の1問あたりの持ち時間（130分/65問 = 2分/問）から逆算した、10分間で解ける目安の問題数
    baseQuestionCount: 5,
    passingScore: 720,
    domains: [
      { id: 1, name: 'セキュアなアーキテクチャの設計', weight: 30, color: '#2563eb' },
      { id: 2, name: 'レジリエントアーキテクチャの設計', weight: 26, color: '#059669' },
      { id: 3, name: '高性能アーキテクチャの設計', weight: 24, color: '#d97706' },
      { id: 4, name: 'コスト最適化アーキテクチャの設計', weight: 20, color: '#7c3aed' },
    ],
  },
]

export const DIFFICULTIES = [
  {
    id: 'basic',
    label: '基礎',
    description: '単一のAWSサービスや概念の理解を問う（例: ELBの役割は何か）',
  },
  {
    id: 'applied',
    label: '応用',
    description: '2つ程度の判断軸を組み合わせて解く（例: 購入オプション＋ストレージ設計を同時に問う）',
  },
  {
    id: 'hard',
    label: '高難易度',
    description: '選択肢同士が紛らわしく、慎重な識別を要求する',
  },
]

export function getExam(examId) {
  return EXAMS.find((e) => e.id === examId) ?? EXAMS[0]
}

export function getDifficulty(difficultyId) {
  return DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[0]
}

export function domainName(examId, domainId) {
  const exam = getExam(examId)
  return exam.domains.find((d) => d.id === Number(domainId))?.name ?? `ドメイン${domainId}`
}

export function domainColor(examId, domainId) {
  const exam = getExam(examId)
  return exam.domains.find((d) => d.id === Number(domainId))?.color ?? '#64748b'
}
