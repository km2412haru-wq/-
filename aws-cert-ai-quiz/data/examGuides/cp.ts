import type { ExamGuide } from "@/types/quiz";

/**
 * AWS Certified Cloud Practitioner (CLF-C02) の出題ガイド。
 * ドメイン名・出題比率は AWS公式試験ガイド(CLF-C02, 2023年改定版)に基づく。
 * 試験ガイドが改定された場合はここを更新すること。
 */
export const CP_EXAM_GUIDE: ExamGuide = {
  id: "CP",
  name: "AWS Certified Cloud Practitioner (CLF-C02)",
  sourceNote: "AWS公式試験ガイド CLF-C02(2023年改定版)に基づく",
  domains: [
    {
      id: 1,
      name: "クラウドの概念",
      weight: 24,
      topics: [
        "クラウドコンピューティングのメリット",
        "AWSクラウドの価値提案",
        "クラウド経済性(初期投資 vs 運用コスト)",
        "スケーラビリティと弾力性",
        "高可用性・耐障害性の考え方",
        "AWS Well-Architected Framework の6つの柱",
        "従量課金モデルの基本",
        "クラウド導入によるビジネス上のメリット",
      ],
    },
    {
      id: 2,
      name: "セキュリティとコンプライアンス",
      weight: 30,
      topics: [
        "責任共有モデル",
        "IAM(ユーザー・グループ・ロール・ポリシー)",
        "AWS Organizations と SCP",
        "多要素認証(MFA)",
        "AWS Shield / AWS WAF",
        "AWS Artifact とコンプライアンスレポート",
        "AWS Trusted Advisor のセキュリティチェック",
        "Amazon GuardDuty / AWS Security Hub",
        "データ暗号化(保管時・転送時)",
        "AWS KMS の基本",
        "セキュリティ関連の各種問い合わせ先(セキュリティ vs コンプライアンス vs 不正利用)",
      ],
    },
    {
      id: 3,
      name: "クラウドテクノロジーとサービス",
      weight: 34,
      topics: [
        "AWSのグローバルインフラ(リージョン・アベイラビリティーゾーン・エッジロケーション)",
        "Amazon EC2 の基本",
        "Amazon S3 とストレージクラス",
        "Amazon VPC の基本",
        "AWS Lambda とサーバーレスの概念",
        "Amazon RDS / Amazon DynamoDB の使い分け",
        "Elastic Load Balancing と Auto Scaling",
        "Amazon CloudFront",
        "AWSの主要な移行・展開手段(AWS Snowball, AWS DataSync 等)",
        "マネジメントコンソール・CLI・SDKの違い",
        "Amazon CloudWatch による監視の基本",
        "機械学習・生成AI関連サービスの概要(Amazon SageMaker, Amazon Bedrock 等)",
      ],
    },
    {
      id: 4,
      name: "請求、料金、サポート",
      weight: 12,
      topics: [
        "AWS無料利用枠",
        "AWS Pricing Calculator / AWS Cost Explorer",
        "AWS Budgets によるコスト管理",
        "Savings Plans とリザーブドインスタンス",
        "AWSサポートプランの違い(Basic/Developer/Business/Enterprise)",
        "AWS Marketplace の基本",
        "コンソリデーティッドビリング(一括請求)",
        "TCO(総所有コスト)の考え方",
      ],
    },
  ],
};
