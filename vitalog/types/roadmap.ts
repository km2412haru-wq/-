/**
 * F2〜F12は今回のセッションではロジック未実装。
 * 将来の実装時に迷わないよう、要件定義書(docs/requirements.md)に基づく
 * データ型の当たりだけをここに置いておく。実データはまだ発生しないため、
 * VitalogStore(types/vitalog.ts)には含めていない。
 */

/** F2: 減薬・増薬(テーパリング)の履歴1件 */
export interface TaperingEvent {
  id: string;
  medicationName: string;
  date: string;
  /** 変更後の用量(自由記述) */
  newDose: string;
  note?: string;
}

/** F3: 気温・気圧・湿度のスナップショット(Open-Meteo等から取得予定) */
export interface EnvironmentSnapshot {
  date: string;
  temperatureC?: number;
  pressureHpa?: number;
  humidityPercent?: number;
}

export const ACTIVITY_TAGS = [
  "授業",
  "バイト",
  "部活",
  "ゼミ",
  "資格勉強",
  "仕事",
  "通勤",
  "シフト",
] as const;
export type ActivityTag = (typeof ACTIVITY_TAGS)[number] | string;

export const LOAD_LEVELS = ["暇", "普通", "過密"] as const;
export type LoadLevel = (typeof LOAD_LEVELS)[number];

/** F9: 日々のスケジュール・負荷感 */
export interface ScheduleEntry {
  id: string;
  date: string;
  loadLevel: LoadLevel;
  activityTags: ActivityTag[];
  sleepHours?: number;
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
