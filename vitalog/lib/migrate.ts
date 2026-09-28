import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

/**
 * F8: 仕様変更後も旧データを破棄せず読み込むためのマイグレーション機構。
 *
 * 将来 SCHEMA_VERSION を上げる際は、ここに
 *   `if (data.version === N) data = migrateNtoNPlus1(data);`
 * の形で変換ステップを追加していく。既存の変換ロジックは消さず積み重ねること。
 */
export function migrateToLatest(raw: unknown): VitalogStore {
  if (!raw || typeof raw !== "object") {
    return { version: SCHEMA_VERSION, dailyLogs: [] };
  }

  const data = raw as { version?: unknown; dailyLogs?: unknown };

  // バージョン番号が無い(=最初期のスキーマより前)データはここで空扱いにする。
  // 現時点ではv1しか存在しないため実質no-opだが、将来ここに旧形式の変換を追加する。
  if (data.version !== 1) {
    return { version: SCHEMA_VERSION, dailyLogs: [] };
  }

  const dailyLogs = Array.isArray(data.dailyLogs)
    ? data.dailyLogs.map(normalizeDailyLog)
    : [];

  return { version: SCHEMA_VERSION, dailyLogs };
}

/** 個々のレコードのフィールド欠損を補い、将来のオプショナル項目追加にも耐えるようにする */
function normalizeDailyLog(raw: unknown): DailyLog {
  const entry = raw as Partial<DailyLog>;
  return {
    id: entry.id ?? "",
    targetDate: entry.targetDate ?? "",
    recordedAt: entry.recordedAt ?? new Date().toISOString(),
    skipped: entry.skipped ?? false,
    temperature: entry.temperature,
    conditionScore: entry.conditionScore,
    jointPain: Array.isArray(entry.jointPain) ? entry.jointPain : [],
    soreThroat: entry.soreThroat,
    moodScore: entry.moodScore,
    moodReasonTags: Array.isArray(entry.moodReasonTags) ? entry.moodReasonTags : [],
    rash: entry.rash,
    musclePain: entry.musclePain,
    lymphNodeSwelling: entry.lymphNodeSwelling,
    medications: Array.isArray(entry.medications) ? entry.medications : [],
    memo: entry.memo,
    memoTags: entry.memoTags,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}
