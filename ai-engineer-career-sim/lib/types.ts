// 職種ルート
export type RouteType = "ml" | "prompt" | "mlops";

// 転職先の企業文化タイプ（イベント/演出の出し分けに使う）
export type CultureType =
  | "startup" // シード期スタートアップ
  | "foreign" // 外資
  | "japanese_major" // 日系大手
  | "japanese_mid"; // 日系中堅・中小

export type Tier = 1 | 2 | 3 | 4 | 5;

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

export interface ActionChoice {
  id: string;
  label: string;
  tooltip: string;
  apply: (s: GameState) => { state: GameState; log: string };
}

export interface GameAction {
  id: string;
  label: string;
  emoji: string;
  apCost: number;
  category: ActionCategory;
  tooltip: string;
  term?: { name: string; desc: string }; // 用語解説
  routes?: RouteType[]; // 指定ルートのみ強化/専用の場合
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

export interface InterviewState {
  company: Company;
  step: number; // 0-indexed 現在のステップ
  passedSteps: number;
  failed: boolean;
  question: InterviewQuestion;
}

export interface InterviewQuestion {
  prompt: string;
  options: { id: string; label: string; correct: boolean }[];
  note: string;
}

export interface JobHistoryEntry {
  companyId: string;
  name: string;
  emoji: string;
  weeksWorked: number;
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
  shortSprint: boolean; // 1週間クリア縛り(納期を大幅短縮)
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

  week: number; // 累計経過週
  weeksLeft: number; // 現プロジェクトの残り納期
  projectTotalWeeks: number;
  projectIndex: number; // 現職での何個目のプロジェクトか

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

  reputation: number; // 累計実績スコア（キャリアスコア）
  comboCount: number;
  scoreMultiplier: number;

  salary: number; // 万円/年
  currentCompany: Company;
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
