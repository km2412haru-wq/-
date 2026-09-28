/**
 * F3, F5/F6/F11, F7, F12-*は今回のセッションではロジック未実装。
 * 将来の実装時に迷わないよう、要件定義書(docs/requirements.md)に基づく
 * データ型の当たりだけをここに置いておく。実データはまだ発生しないため、
 * VitalogStore(types/vitalog.ts)には含めていない。
 */

/** F3: 気温・気圧・湿度のスナップショット(Open-Meteo等から取得予定) */
export interface EnvironmentSnapshot {
  date: string;
  temperatureC?: number;
  pressureHpa?: number;
  humidityPercent?: number;
}

/** F12-1: 自分で登録する仮説 */
export interface Hypothesis {
  id: string;
  /** 例: 「気圧低下を3日後に関節痛」 */
  statement: string;
  createdAt: string;
  /** データ蓄積に応じて更新される支持率(0-1)。未検証はundefined */
  supportRate?: number;
}

/** F12-2: セルフA/Bテストの介入宣言 */
export interface SelfExperiment {
  id: string;
  description: string;
  startDate: string;
  endDate?: string;
}
