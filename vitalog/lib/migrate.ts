import {
  SCHEMA_VERSION,
  type DailyLog,
  type Hypothesis,
  type RegisteredMedication,
  type SelfExperiment,
  type TaperingEvent,
  type VitalogStore,
  type Visit,
} from "@/types/vitalog";

/**
 * F8: 仕様変更後も旧データを破棄せず読み込むためのマイグレーション機構。
 *
 * 将来 SCHEMA_VERSION を上げる際は、ここに
 *   `if (data.version === N) data = migrateNtoNPlus1(data);`
 * の形で変換ステップを追加していく。既存の変換ロジックは消さず積み重ねること。
 * (フィールドの追加のように後方互換な変更は、バージョンを上げずに
 * normalize関数側でデフォルト値を補うだけでよい)
 */
export function migrateToLatest(raw: unknown): VitalogStore {
  const empty: VitalogStore = {
    version: SCHEMA_VERSION,
    dailyLogs: [],
    registeredMedications: [],
    taperingEvents: [],
    hypotheses: [],
    selfExperiments: [],
    visits: [],
  };

  if (!raw || typeof raw !== "object") {
    return empty;
  }

  const data = raw as {
    version?: unknown;
    dailyLogs?: unknown;
    registeredMedications?: unknown;
    taperingEvents?: unknown;
    hypotheses?: unknown;
    selfExperiments?: unknown;
    visits?: unknown;
  };

  // バージョン番号が無い(=最初期のスキーマより前)データはここで空扱いにする。
  // 現時点ではv1しか存在しないため実質no-opだが、将来ここに旧形式の変換を追加する。
  if (data.version !== 1) {
    return empty;
  }

  return {
    version: SCHEMA_VERSION,
    dailyLogs: Array.isArray(data.dailyLogs) ? data.dailyLogs.map(normalizeDailyLog) : [],
    registeredMedications: Array.isArray(data.registeredMedications)
      ? data.registeredMedications.map(normalizeRegisteredMedication)
      : [],
    taperingEvents: Array.isArray(data.taperingEvents)
      ? data.taperingEvents.map(normalizeTaperingEvent)
      : [],
    hypotheses: Array.isArray(data.hypotheses) ? data.hypotheses.map(normalizeHypothesis) : [],
    selfExperiments: Array.isArray(data.selfExperiments)
      ? data.selfExperiments.map(normalizeSelfExperiment)
      : [],
    visits: Array.isArray(data.visits) ? data.visits.map(normalizeVisit) : [],
  };
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
    fatigueUnusual: entry.fatigueUnusual,
    loadLevel: entry.loadLevel,
    activityTags: Array.isArray(entry.activityTags) ? entry.activityTags : [],
    sleepHours: entry.sleepHours,
    productivityScore: entry.productivityScore,
    environment: entry.environment,
    rash: entry.rash,
    musclePain: entry.musclePain,
    lymphNodeSwelling: entry.lymphNodeSwelling,
    labs: entry.labs,
    medications: Array.isArray(entry.medications) ? entry.medications : [],
    topicalMedications: Array.isArray(entry.topicalMedications) ? entry.topicalMedications : [],
    memo: entry.memo,
    memoTags: entry.memoTags,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeRegisteredMedication(raw: unknown): RegisteredMedication {
  const entry = raw as Partial<RegisteredMedication>;
  return {
    id: entry.id ?? "",
    name: entry.name ?? "",
    dose: entry.dose,
    type: entry.type ?? "regular",
    reminderTime: entry.reminderTime,
    active: entry.active ?? true,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

function normalizeTaperingEvent(raw: unknown): TaperingEvent {
  const entry = raw as Partial<TaperingEvent>;
  return {
    id: entry.id ?? "",
    medicationName: entry.medicationName ?? "",
    date: entry.date ?? "",
    newDose: entry.newDose ?? "",
    note: entry.note,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

function normalizeHypothesis(raw: unknown): Hypothesis {
  const entry = raw as Partial<Hypothesis>;
  return {
    id: entry.id ?? "",
    statement: entry.statement ?? "",
    createdAt: entry.createdAt ?? new Date().toISOString(),
    note: entry.note,
  };
}

function normalizeSelfExperiment(raw: unknown): SelfExperiment {
  const entry = raw as Partial<SelfExperiment>;
  return {
    id: entry.id ?? "",
    description: entry.description ?? "",
    startDate: entry.startDate ?? "",
    endDate: entry.endDate,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

function normalizeVisit(raw: unknown): Visit {
  const entry = raw as Partial<Visit>;
  return {
    id: entry.id ?? "",
    visitDate: entry.visitDate ?? "",
    hospitalName: entry.hospitalName,
    department: entry.department,
    memo: entry.memo,
    nextVisitDate: entry.nextVisitDate,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}
