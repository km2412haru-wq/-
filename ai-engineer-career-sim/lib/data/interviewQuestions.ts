export type QuestionCategory = "coding" | "case" | "culture" | "general";

export interface QuestionDef {
  category: QuestionCategory;
  prompt: string;
  options: { label: string; correct: boolean }[];
  note: string; // 正解の解説（学べる要素）
}

export const QUESTION_BANK: QuestionDef[] = [
  {
    category: "coding",
    prompt: "モデルの過学習（overfitting）を防ぐ手法として適切なのは？",
    options: [
      { label: "Dropoutや正則化を導入する", correct: true },
      { label: "学習率を極端に上げる", correct: false },
      { label: "検証データも学習に混ぜる", correct: false },
      { label: "エポック数を無制限に増やす", correct: false },
    ],
    note: "過学習は訓練データに適合しすぎて未知データに弱くなる現象。Dropoutや正則化、早期終了で抑制する。",
  },
  {
    category: "coding",
    prompt: "RAG（Retrieval-Augmented Generation）の説明として正しいのは？",
    options: [
      { label: "外部知識を検索して回答生成に活用する手法", correct: true },
      { label: "GPUを並列化して学習を高速化する手法", correct: false },
      { label: "画像を圧縮してAPI通信量を減らす手法", correct: false },
      { label: "モデルの重みをランダムに初期化する手法", correct: false },
    ],
    note: "RAGは外部知識ベースを検索し、その結果を踏まえて回答を生成することで精度や最新性を高める手法。",
  },
  {
    category: "coding",
    prompt: "APIのレート制限や高負荷に備える設計として適切なのは？",
    options: [
      { label: "リトライ・バックオフとキャッシュを組み合わせる", correct: true },
      { label: "すべてのリクエストを即座に再送し続ける", correct: false },
      { label: "監視やアラートを一切設定しない", correct: false },
      { label: "本番でだけテストする", correct: false },
    ],
    note: "指数バックオフ付きリトライとキャッシュ戦略は、コスト爆発や障害の連鎖を防ぐ基本設計。",
  },
  {
    category: "coding",
    prompt: "過学習の兆候を検知する一般的な方法は？",
    options: [
      { label: "学習データと検証データの精度差を監視する", correct: true },
      { label: "学習データの件数だけを見る", correct: false },
      { label: "コードの行数を数える", correct: false },
      { label: "GPUの温度を見る", correct: false },
    ],
    note: "訓練精度は高いのに検証精度が伸びない/悪化する場合、過学習が疑われる。",
  },
  {
    category: "case",
    prompt: "予算超過が見込まれるプロジェクトで最初にすべき行動は？",
    options: [
      { label: "影響範囲を整理し、関係者へ早めに共有する", correct: true },
      { label: "誰にも言わず自分で何とかする", correct: false },
      { label: "予算を無視して開発を続ける", correct: false },
      { label: "プロジェクトをすぐ中止する", correct: false },
    ],
    note: "早期のエスカレーションは信頼を損なわない。問題を抱え込むほど手遅れになりやすい。",
  },
  {
    category: "case",
    prompt: "顧客から急な仕様変更を求められた。最も適切な初動は？",
    options: [
      { label: "変更の背景と優先度を確認し、影響を見積もる", correct: true },
      { label: "即座に全て受け入れて作業を始める", correct: false },
      { label: "理由を聞かずにきっぱり断る", correct: false },
      { label: "納期をこっそり伸ばす", correct: false },
    ],
    note: "背景理解と影響見積もりを先に行うことで、無用な手戻りや対立を避けられる。",
  },
  {
    category: "case",
    prompt: "納期に対して進捗が大幅に遅れている。取るべき行動は？",
    options: [
      { label: "スコープを見直し、優先順位を再設定する", correct: true },
      { label: "残業だけで乗り切ろうとする", correct: false },
      { label: "報告を先延ばしにする", correct: false },
      { label: "品質チェックを全て省略する", correct: false },
    ],
    note: "スコープ調整は健全な選択肢の一つ。品質を犠牲にした帳尻合わせは後で大きな代償を伴う。",
  },
  {
    category: "case",
    prompt: "チームメンバーの意見が真っ二つに割れた。とるべき行動は？",
    options: [
      { label: "データや根拠を示しながら合意形成を図る", correct: true },
      { label: "多数決で強引に決める", correct: false },
      { label: "自分の意見だけを押し通す", correct: false },
      { label: "決定を先延ばしにし続ける", correct: false },
    ],
    note: "客観的な根拠を持ち寄ることで、感情的な対立を避けて建設的な意思決定ができる。",
  },
  {
    category: "culture",
    prompt: "失敗に気づいたとき、報告するタイミングとして適切なのは？",
    options: [
      { label: "気づいた時点ですぐに共有する", correct: true },
      { label: "完全に解決してから報告する", correct: false },
      { label: "聞かれるまで黙っておく", correct: false },
      { label: "評価に響くので報告しない", correct: false },
    ],
    note: "早期の失敗共有は多くの組織で評価される姿勢。被害を最小化し、信頼構築にもつながる。",
  },
  {
    category: "culture",
    prompt: "多様なバックグラウンドを持つメンバーと働く上で大切なことは？",
    options: [
      { label: "相手の背景を理解しようとする姿勢を持つ", correct: true },
      { label: "自分のやり方を変えない", correct: false },
      { label: "多数派に合わせるよう強制する", correct: false },
      { label: "関わりを最小限にする", correct: false },
    ],
    note: "多様性を活かすチームでは、違いを理解し尊重する姿勢が成果に直結する。",
  },
  {
    category: "culture",
    prompt: "フィードバックを受け取るときの望ましい姿勢は？",
    options: [
      { label: "感情を切り離し、改善の材料として受け止める", correct: true },
      { label: "反論してすぐに終わらせる", correct: false },
      { label: "落ち込んで何もしなくなる", correct: false },
      { label: "聞き流して忘れる", correct: false },
    ],
    note: "建設的なフィードバックを次の行動に活かせる人は、成長速度が速いと評価されやすい。",
  },
  {
    category: "culture",
    prompt: "裁量の大きい環境で働くうえで重要なことは？",
    options: [
      { label: "自ら優先順位を判断し、進捗を主体的に共有する", correct: true },
      { label: "指示が来るまで何もしない", correct: false },
      { label: "誰にも報告せず独断で進める", correct: false },
      { label: "常に他人の判断を待つ", correct: false },
    ],
    note: "裁量が大きいほど、自律的な判断力と透明性のある報連相の両立が求められる。",
  },
  {
    category: "general",
    prompt: "ハルシネーションとは何か？",
    options: [
      { label: "AIが事実と異なる情報をもっともらしく生成すること", correct: true },
      { label: "GPUが過熱して停止する現象", correct: false },
      { label: "ユーザーが誤った質問をすること", correct: false },
      { label: "モデルの学習が完全に停止すること", correct: false },
    ],
    note: "ハルシネーションはAI活用における代表的なリスクの一つ。RAGや検証プロセスで低減できる。",
  },
  {
    category: "general",
    prompt: "ファインチューニングの説明として正しいのは？",
    options: [
      { label: "既存の学習済みモデルを自社データで追加学習すること", correct: true },
      { label: "モデルを完全にゼロから再構築すること", correct: false },
      { label: "サーバーのスペックを増強すること", correct: false },
      { label: "UIのデザインを調整すること", correct: false },
    ],
    note: "ファインチューニングはゼロからの学習よりコストを抑えつつ、用途に特化させられる手法。",
  },
  {
    category: "general",
    prompt: "MLOpsが扱う領域として適切なのは？",
    options: [
      { label: "モデルの学習から運用・監視までを一貫して管理すること", correct: true },
      { label: "デザインカンプの作成のみ", correct: false },
      { label: "営業資料の作成のみ", correct: false },
      { label: "法務契約の締結のみ", correct: false },
    ],
    note: "MLOpsは学習・デプロイ・監視・再学習までのライフサイクル全体を効率的に回す仕組み。",
  },
  {
    category: "general",
    prompt: "評価指標（精度・再現率など）を使う目的は？",
    options: [
      { label: "モデルの性能を客観的な物差しで測るため", correct: true },
      { label: "デザインの見た目を評価するため", correct: false },
      { label: "サーバーの費用を計算するため", correct: false },
      { label: "社員の勤怠を管理するため", correct: false },
    ],
    note: "評価指標があることで、改善が本当に効果を上げているかを客観的に判断できる。",
  },
];

export function pickQuestion(category: QuestionCategory): QuestionDef {
  const pool = QUESTION_BANK.filter((q) => q.category === category);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function categoryForStep(stepName: string): QuestionCategory {
  if (stepName.includes("コーディング")) return "coding";
  if (stepName.includes("ケース") || stepName.includes("適性") || stepName.includes("論理") || stepName.includes("小論文")) return "case";
  if (stepName.includes("最終") || stepName.includes("人物") || stepName.includes("カルチャー") || stepName.includes("カジュアル")) return "culture";
  return "general";
}
