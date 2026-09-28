/**
 * データ構造のバージョン。
 * 仕様変更時は上げる前に必ず lib/migrate.ts に旧バージョンからの変換関数を追加すること
 * (F8: 「データの引き継ぎやすさ」を最優先する設計方針のため、破壊的変更をしない)。
 */
export const SCHEMA_VERSION = 1;

export const JOINT_SITES = ["膝", "手", "足", "肘", "肩", "その他"] as const;
export type JointSite = (typeof JOINT_SITES)[number];

export interface JointPainEntry {
  site: JointSite;
  /** 1(軽い)〜5(激しい) */
  severity: 1 | 2 | 3 | 4 | 5;
}

export const MOOD_REASON_TAGS = [
  "体調不良",
  "人間関係",
  "将来不安",
  "疲労",
  "特になし",
] as const;
export type MoodReasonTag = (typeof MOOD_REASON_TAGS)[number];

export const MEDICATION_TYPES = ["regular", "asNeeded"] as const;
export type MedicationType = (typeof MEDICATION_TYPES)[number];

export interface MedicationRecord {
  id: string;
  name: string;
  /** 用量。単位込みの自由記述(例: "5mg") */
  dose?: string;
  /** 定期薬か頓服か */
  type: MedicationType;
  /** 服薬時刻(HH:mm)。未入力可 */
  time?: string;
}

/**
 * F1: 毎日の体調記録。
 * 「いつでも記録可能」「後入力・スキップ可」の方針のため、
 * 記録対象日(targetDate)と実際の入力時刻(recordedAt)を分けて持つ。
 */
export interface DailyLog {
  id: string;
  /** この記録が対象とする日(YYYY-MM-DD)。後入力時はここを過去日にする */
  targetDate: string;
  /** 実際に入力ボタンを押した日時(ISO8601)。改ざんしない実入力ログ */
  recordedAt: string;
  /** この日は「スキップ」を選んだ記録かどうか。trueの場合、他の値は無視してよい */
  skipped: boolean;

  // --- 必須項目 ---
  /** 体温(℃)。未入力を許容するため optional */
  temperature?: number;
  /** 体調スコア 1(最悪)〜10(絶好調) */
  conditionScore?: number;
  jointPain: JointPainEntry[];
  /** 咽頭痛。「普段と違う感覚」を拾いたいため強さに加えて自由記述を持てる */
  soreThroat?: {
    severity: 1 | 2 | 3 | 4 | 5;
    /** 「いつもと違う」感覚があった場合のメモ */
    unusualNote?: string;
  };
  /** 気分スコア 1〜10。常時表示 */
  moodScore?: number;
  /** moodScore が低い時のみ入力される理由タグ */
  moodReasonTags: MoodReasonTag[];

  // --- 任意・低優先度項目 ---
  /** 皮疹。写真は実験的機能のためdata URLとして保存(将来Driveバックアップの対象からは除外予定) */
  rash?: {
    note?: string;
    photoDataUrl?: string;
  };
  musclePain?: {
    severity: 1 | 2 | 3 | 4 | 5;
    note?: string;
  };
  lymphNodeSwelling?: {
    note?: string;
  };

  medications: MedicationRecord[];

  /** 自由メモ。Web Speech APIによる音声入力も同じ欄に反映される */
  memo?: string;
  /** LLMによるメモの構造化タグ付け結果(任意・失敗しても記録自体は成立する) */
  memoTags?: string[];

  createdAt: string;
  updatedAt: string;
}

/** localStorageに保存する際の実データ形式(バージョン付き) */
export interface VitalogStoreV1 {
  version: 1;
  dailyLogs: DailyLog[];
}

export type VitalogStore = VitalogStoreV1;
