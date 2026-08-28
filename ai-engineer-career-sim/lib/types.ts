// 職種ルート（現在はAIコンサルタント一本）
export type RouteType = "consultant";

// 住まいのグレード。シェアハウス→アパート→マンションの順にアップグレードできる
// （マイホーム購入はboughtHouseフラグで別管理・最終形態）
export type Residence = "share_house" | "apartment" | "mansion";

// プロジェクトのフェーズ。実際のAIエンジニアの業務工程（データ収集・分析→AIモデル開発→
// システムへの実装→運用・改善）になぞらえた4段階。進捗に応じて自動的に進み、
// フェーズごとに解放されるアクションが変わる
export type Phase = "data" | "model" | "implementation" | "operation";

// 勤務地。企業の業界から自動的に決まる（郊外＝工場地帯が多い製造業、それ以外は都心）
export type WorkLocation = "urban" | "suburb";

// 転職先の企業文化タイプ（イベント/演出の出し分けに使う）
export type CultureType =
  | "startup" // シード期スタートアップ
  | "foreign" // 外資
  | "japanese_major" // 日系大手
  | "japanese_mid"; // 日系中堅・中小

export type Tier = 1 | 2 | 3 | 4 | 5;

// 業界タイプ（今の勤め先との「親和性」を測るのに使う）
export type Industry = "tech" | "consulting" | "thinktank" | "trading" | "finance" | "manufacturing" | "general";

// オファー比較レーダーチャートの7軸
export interface CompanyAxes {
  salary: number; // 給与
  discretion: number; // 裁量権
  growth: number; // 成長環境
  stability: number; // 安定性
  wlb: number; // ワークライフバランス
  techGrowth: number; // 技術力向上
  fame: number; // 知名度
}

export interface Company {
  id: string;
  name: string;
  emoji: string;
  tier: Tier;
  culture: CultureType;
  industry: Industry; // 業界タイプ。現職からの転職しやすさ（親和性）に影響する
  interviewSteps: string[]; // 選考ステップ名の配列
  axes: CompanyAxes;
  scoreThreshold: number; // このスコア以上でスカウトが来やすくなる
  baseSalary: number; // 万円/年
  flavor: string;
}

export type ActionCategory =
  | "planning"
  | "data"
  | "model"
  | "build"
  | "quality"
  | "growth"
  | "social"
  | "career"
  | "rest";

// アクションの効果を1つずつ明記するためのチップ（例：「進捗+3」「評価+1」）
export interface EffectHint {
  label: string;
  tone: "good" | "bad" | "neutral";
}

export interface ActionChoice {
  id: string;
  label: string;
  tooltip: string;
  when: string; // いつ使うか
  effects: EffectHint[]; // 何にどう作用するか（評価スコアへの影響を含む）
  apply: (s: GameState) => { state: GameState; log: string };
}

export interface GameAction {
  id: string;
  label: string;
  emoji: string;
  apCost: number;
  category: ActionCategory;
  tooltip: string;
  when?: string; // いつ使うか（choicesがある場合はchoice側に持たせる）
  effects?: EffectHint[]; // 何にどう作用するか（choicesがある場合はchoice側に持たせる）
  term?: { name: string; desc: string }; // 用語解説
  roleTagRequired?: string; // 指定した案件の職種（roleTag）の時だけ出現する専用アクション
  phaseRequired?: Phase; // 指定フェーズの時だけ出現する専用アクション
  choices?: ActionChoice[]; // 選択肢がある場合（この場合 apply は使わない）
  apply?: (s: GameState) => { state: GameState; log: string };
}

export interface EventChoice {
  id: string;
  label: string;
  tooltip?: string;
  apply: (s: GameState) => { state: GameState; log: string };
}

export interface GameEvent {
  id: string;
  title: string;
  emoji: string;
  description: string;
  weight: (s: GameState) => number; // 0なら発生しない
  choices: EventChoice[];
  hidden?: boolean; // レアイベント
}

export interface Offer {
  offerId: string;
  company: Company;
  rolledAxes: CompanyAxes;
  rolledSalary: number;
  receivedWeek: number;
}

// 選考ステップでどの力が重視されるか（クイズではなく、蓄積した実力そのもので判定する）
export type StepFocus = "tech" | "comm" | "balance";

export interface InterviewState {
  company: Company;
  step: number; // 0-indexed 現在のステップ
  passedSteps: number;
  failed: boolean;
  focus: StepFocus;
  flavor: string; // このステップで何が問われるかの説明文
}

// プロジェクトごとのミッション：毎回同じ作業に見えないよう、案件ごとに
// 物語・成功条件・ボーナス条件を変える
export interface Mission {
  id: string;
  emoji: string;
  title: string;
  brief: string; // 案件の背景・依頼内容（ストーリー）
  roleTag: string; // 案件の職種フレーバー（AI開発エンジニア/AIコンサルタント/広告テックエンジニア等）
  cultures: CultureType[]; // どの企業文化で発生しうる案件か（会社によって案件の傾向が変わる）
  successQuality: number;
  successProgress: number;
  bonusLabel: string; // 追加ボーナスの説明文（常に表示する）
  bonusReputation: number;
  bonusCheck: (s: GameState) => boolean;
  recommendedActionIds: string[]; // このミッションで特に効果が高いアクション（選ぶと評価ボーナスが倍になる）
  flavorSuccess: string;
  flavorPartial: string;
  flavorFail: string;
}

// 資格：「資格勉強をする」アクションをコツコツ積み重ねて取得する。
// 取得すると恒久的に技術力/コミュ力が底上げされる
export interface Certification {
  id: string;
  emoji: string;
  name: string;
  studyPerSession: number; // 1回の資格勉強アクションで進む習熟度（0〜100のうち何%進むか）
  techGain: number;
  commGain: number;
  log: string;
}

export interface JobHistoryEntry {
  companyId: string;
  name: string;
  emoji: string;
  weeksWorked: number; // その会社に在籍していた月数（累計経過月数ではない）
  culture: CultureType;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
  check: (s: GameState, ctx: AchievementCtx) => boolean;
}

export interface AchievementCtx {
  justEndedProject?: boolean;
  projectSucceeded?: boolean;
  incidentThisProject?: boolean;
  justJoinedCompanyId?: string;
  justSawEnding?: string;
  meta?: CareerMeta;
}

export interface ChallengeFlags {
  halfBudget: boolean;
  shortSprint: boolean; // 2ヶ月クリア縛り(納期を大幅短縮)
  priceHike?: boolean; // API価格高騰(NG+由来。createInitialStateが自動算出する)
}

export interface HistoryPoint {
  week: number;
  quality: number;
  satisfaction: number;
  reputation: number;
}

export type Screen =
  | "title"
  | "route"
  | "play"
  | "achievements"
  | "ranking"
  | "codex"
  | "ending";

// 周回・プレイヤーをまたいで蓄積されるメタ情報（localStorageに保存）
export interface CareerMeta {
  gamesPlayed: number;
  gamesCleared: number;
  routesCleared: RouteType[];
  companiesEverJoined: string[];
  bestReputation: number;
  totalJobChangesEver: number;
  playerLevel: number;
  playerXp: number;
  sawFireEnding: boolean;
  sawGoogleOffer: boolean;
  unlockedAchievementsGlobal: string[];
  seenCompaniesGlobal: string[];
  seenEventsGlobal: string[];
}

export interface RankingEntry {
  date: string;
  title: string;
  route: RouteType;
  reputation: number;
  jobChangeCount: number;
  ending: string;
  ngPlusLevel: number;
}

export interface GameState {
  screen: Screen;
  route: RouteType;
  ngPlusLevel: number;
  challenge: ChallengeFlags;

  week: number; // 累計経過月数（1ターン=2ヶ月）
  weeksLeft: number; // 現プロジェクトの残り納期（ヶ月）
  projectTotalWeeks: number;
  projectIndex: number; // 現職での何個目のプロジェクトか
  currentMission: Mission; // 今のプロジェクトのミッション（案件ごとに変わる）
  usedMissionIds: string[]; // 直近で使ったミッション（連続で同じ案件にならないようにする）
  phase: Phase; // 現在のプロジェクトフェーズ（進捗に応じて自動的に進む）

  budget: number;
  budgetMax: number;
  ap: number;
  apMax: number;

  progress: number; // 0-100
  quality: number; // 0-100 精度
  satisfaction: number; // 0-100 満足度
  techScore: number;
  commScore: number;
  fatigue: number; // 0-100 高いほど悪い

  reputation: number; // 累計評価スコア（キャリアスコア）
  comboCount: number;
  scoreMultiplier: number;

  salary: number; // 万円/年
  personalSavings: number; // 万円。会社の予算とは別の、個人の貯金（給料-生活費-家賃が2ヶ月ごとに積み上がる）
  motivation: number; // 0-100。プライベートの充実度。買い物に貯金を使うと上がり、放っておくと少しずつ下がる
  hobbySpentThisMonth: boolean; // このターン（2ヶ月）ですでに買い物をしたか
  boughtHouse: boolean; // マイホームを購入したか
  residence: Residence; // 住まいのグレード（マイホーム購入後は実質的に上書きされる）
  ownsCar: boolean; // 車を購入したか
  married: boolean; // 結婚したか
  hasChild: boolean; // 子供が生まれたか
  hasPet: boolean; // ペットを飼っているか
  hasPartner: boolean; // 交際相手がいるか（合コン等で得られる。結婚イベントが起きやすくなる）
  certifications: string[]; // 取得した資格のid一覧
  certStudyProgress: Record<string, number>; // 勉強中の資格の習熟度（id→0-100、100で取得）
  currentCompany: Company;
  companyStartWeek: number; // 現在の会社に転職した時点のweek（在籍月数の算出に使う）
  familiarity: number; // 0-100 馴染み度
  jobHistory: JobHistoryEntry[];
  jobChangeCount: number;

  offers: Offer[];
  pendingScout: Company | null;
  interview: InterviewState | null;
  interviewOrigin: "scout" | "apply" | null;
  appliedRecently: Record<string, number>; // companyId -> week applied
  stayPrompt: Offer | null;

  activeEvent: { event: GameEvent } | null;
  log: string[];
  history: HistoryPoint[];

  unlockedAchievements: string[];
  seenCompanies: string[];
  seenEvents: string[];
  titlesReached: string[];

  riskLevel: number; // 0-100 高いほどトラブル発生率が上がる

  incidentFreeProject: boolean;
  incidentEverHappened: boolean;
  budgetExactlyZeroed: boolean;
  studiedInARow: number;
  articlesRead: number;

  modelChoice: "inhouse" | "api" | "oss" | null;
  dataChoiceHistory: ("quality" | "quantity")[];

  gameOver: boolean;
  endingType: string | null;
  totalProjectsCompleted: number;
  totalProjectsFailed: number;

  lastActionLabel: string | null;
  counters: Record<string, number>;
}
