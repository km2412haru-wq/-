// Value-chain / business-model segments. A company can occupy several at
// once (e.g. Samsung is both an IDM and a memory maker and a foundry) —
// that overlap is exactly what makes competitive maps interesting.
export type Segment =
  | "idm" // 設計〜製造〜販売まで自社一貫（総合半導体メーカー）
  | "fabless" // 設計に特化し、製造は外部委託
  | "foundry" // 他社設計品の受託製造に特化
  | "memory" // DRAM/NANDなどメモリ専業・準専業
  | "equipment" // 半導体製造装置
  | "materials" // シリコンウェハーやフォトレジストなどの材料
  | "eda" // 設計自動化ソフトウェア（EDA）
  | "ip"; // ライセンス供与するプロセッサIPコア

export type Region = "global" | "japan";

export type Rarity = "UR" | "SSR" | "SR" | "R";

export interface Company {
  id: string;
  name: string;
  nameJa: string;
  country: string;
  flag: string;
  region: Region;
  segments: Segment[];
  /** 売上高の目安（10億USD）。年度・為替により変動するのであくまで規模感の目安。 */
  revenueUsdB: number;
  /** 営業利益率の目安（%）。 */
  operatingMarginPct: number;
  founded: number;
  hq: string;
  /** カードの決め台詞（フレーバーテキスト）。 */
  tagline: string;
  /** どうやって稼いでいる会社かを1〜2文で。 */
  businessModel: string;
  /** カードの裏面に並べる強み・特徴タグ。 */
  strengths: string[];
  /** 直接の競合として名指しする企業のid。 */
  rivals: string[];
  /** カードのグラデーション基調色（16進カラー2色）。 */
  colors: [string, string];
}
