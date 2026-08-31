import type { ExamGuide } from "@/types/quiz";

/**
 * AWS Certified Solutions Architect – Associate (SAA-C03) の出題ガイド。
 * ドメイン名・出題比率は AWS公式試験ガイド(SAA-C03)に基づく。
 * 試験ガイドが改定された場合はここを更新すること。
 */
export const SAA_EXAM_GUIDE: ExamGuide = {
  id: "SAA",
  name: "AWS Certified Solutions Architect – Associate (SAA-C03)",
  sourceNote: "AWS公式試験ガイド SAA-C03 に基づく",
  domains: [
    {
      id: 1,
      name: "セキュアなアーキテクチャの設計",
      weight: 30,
      topics: [
        "IAMポリシー・ロール・信頼関係",
        "AWS Organizations と SCP",
        "AWS KMS によるデータ暗号化",
        "セキュリティグループ と ネットワークACL の違い",
        "VPCエンドポイント(Interface/Gateway)",
        "S3バケットポリシーとブロックパブリックアクセス",
        "AWS Secrets Manager / AWS Systems Manager Parameter Store",
        "AWS WAF / AWS Shield によるアプリケーション保護",
        "マルチアカウント環境でのアクセス制御",
        "監査ログ(AWS CloudTrail, Amazon CloudWatch Logs)",
      ],
    },
    {
      id: 2,
      name: "レジリエントなアーキテクチャの設計",
      weight: 26,
      topics: [
        "マルチAZ構成と単一障害点の排除",
        "Auto Scaling によるスケーラブルな構成",
        "Elastic Load Balancing(ALB/NLB/GWLB)の使い分け",
        "Amazon RDS のマルチAZ・リードレプリカ",
        "Amazon S3 のバージョニングとクロスリージョンレプリケーション",
        "疎結合アーキテクチャ(Amazon SQS, Amazon SNS)",
        "Amazon Route 53 のルーティングポリシーとヘルスチェック",
        "バックアップとディザスタリカバリ戦略(RPO/RTO)",
        "AWS Backup",
        "DynamoDB Global Tables",
      ],
    },
    {
      id: 3,
      name: "高性能アーキテクチャの設計",
      weight: 24,
      topics: [
        "EC2インスタンスタイプの選定",
        "Amazon EBS のボリュームタイプ選定",
        "Amazon S3 ストレージクラスの使い分け",
        "Amazon CloudFront によるキャッシュ・配信最適化",
        "Amazon ElastiCache",
        "Amazon RDS/Auroraの読み取りスケーリング",
        "コンテナサービス(Amazon ECS, Amazon EKS, AWS Fargate)",
        "サーバーレスアーキテクチャ(AWS Lambda, Amazon API Gateway)",
        "AWS Global Accelerator",
        "データベース選定(RDS vs DynamoDB vs Redshift 等)",
      ],
    },
    {
      id: 4,
      name: "コスト最適化アーキテクチャの設計",
      weight: 20,
      topics: [
        "EC2購入オプション(オンデマンド/リザーブド/Savings Plans/スポット)",
        "S3ライフサイクルポリシーとストレージクラス移行",
        "適切なインスタンスサイジング(AWS Compute Optimizer)",
        "サーバーレスによる従量課金化",
        "AWS Cost Explorer / AWS Budgets",
        "データ転送コストの最適化",
        "不要リソースの削減(未使用EIP、未アタッチEBS等)",
        "マネージドサービス活用によるTCO削減",
      ],
    },
  ],
};
