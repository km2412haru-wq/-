import {
  SCHEMA_VERSION,
  type DailyLog,
  type Hypothesis,
  type MedicationRecord,
  type RegisteredMedication,
  type SelfExperiment,
  type SymptomEntry,
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
    storeRevision?: unknown;
    [extra: string]: unknown;
  };

  // バージョン番号が無い(=最初期のスキーマより前)データはここで空扱いにする。
  // 現時点ではv1しか存在しないため実質no-opだが、将来ここに旧形式の変換を追加する。
  if (data.version !== 1) {
    return empty;
  }

  // このコードが知らないトップレベルのキー(新しい版が足したコレクション等)は、そのまま保持する。
  // 既知のキーだけで再構築すると、新しい版で作ったデータを古い版が保存した時に黙って消えてしまう。
  const { version: _v, dailyLogs: _d, registeredMedications: _r, taperingEvents: _t, hypotheses: _h, selfExperiments: _s, visits: _vi, ...unknownTopLevel } = data;
  void [_v, _d, _r, _t, _h, _s, _vi];

  return {
    ...unknownTopLevel,
    version: SCHEMA_VERSION,
    storeRevision: typeof data.storeRevision === "number" ? data.storeRevision : undefined,
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
    // このコードが知らないフィールド(新しい版が足した項目)も落とさず保持する
    ...entry,
    id: entry.id ?? "",
    targetDate: entry.targetDate ?? "",
    recordedAt: entry.recordedAt ?? new Date().toISOString(),
    skipped: entry.skipped ?? false,
    entryMode: entry.entryMode === "quick" || entry.entryMode === "full" ? entry.entryMode : undefined,
    temperature: entry.temperature,
    conditionScore: entry.conditionScore,
    jointPain: Array.isArray(entry.jointPain) ? entry.jointPain : [],
    symptoms: normalizeSymptoms(entry),
    dangerSymptoms: Array.isArray(entry.dangerSymptoms) ? entry.dangerSymptoms : [],
    soreThroat: entry.soreThroat,
    moodScore: entry.moodScore,
    moodReasonTags: Array.isArray(entry.moodReasonTags) ? entry.moodReasonTags : [],
    fatigueUnusual: entry.fatigueUnusual,
    loadLevel: entry.loadLevel,
    activityTags: Array.isArray(entry.activityTags) ? entry.activityTags : [],
    sleepHours: entry.sleepHours,
    sleepStartTime: entry.sleepStartTime,
    productivityScore: entry.productivityScore,
    environment: entry.environment,
    rash: entry.rash,
    musclePain: entry.musclePain,
    lymphNodeSwelling: entry.lymphNodeSwelling,
    labs: entry.labs,
    medications: Array.isArray(entry.medications)
      ? entry.medications.map(normalizeMedicationRecord)
      : [],
    topicalMedications: Array.isArray(entry.topicalMedications) ? entry.topicalMedications : [],
    memo: entry.memo,
    memoTags: entry.memoTags,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}

/**
 * 症状記録の汎用化(旧: soreThroat/musclePainという専用フィールドだったものを
 * symptoms配列に統合)に伴う後方互換処理。
 * 新形式(symptomsが存在)ならそのまま使い、旧形式しか無ければ
 * soreThroat/musclePainから合成する。どちらも無ければ空配列。
 */
function normalizeSymptoms(entry: Partial<DailyLog>): SymptomEntry[] {
  if (Array.isArray(entry.symptoms)) return entry.symptoms;

  const synthesized: SymptomEntry[] = [];
  if (entry.soreThroat) {
    synthesized.push({
      name: "咽頭痛",
      severity: entry.soreThroat.severity,
      unusualNote: entry.soreThroat.unusualNote,
    });
  }
  if (entry.musclePain) {
    synthesized.push({
      name: "筋肉痛",
      severity: entry.musclePain.severity,
      unusualNote: entry.musclePain.note,
    });
  }
  return synthesized;
}

/**
 * 服薬記録の2値(taken: true/false)から3値(intake)への移行。
 * - 既にintakeがあればそのまま使う
 * - 旧データでtaken === false(明示的に外された)なら「未服用」
 * - それ以外(takenがtrueまたは未設定=服用として記録されたもの、旧・手動記録を含む)は「服用」
 * 旧データは「未確認」という概念が無く、記録がある=服用として扱うのが当時の意味に最も近い。
 */
function normalizeMedicationRecord(raw: MedicationRecord): MedicationRecord {
  if (raw.intake === "taken" || raw.intake === "notTaken" || raw.intake === "unconfirmed") {
    return raw;
  }
  return { ...raw, intake: raw.taken === false ? "notTaken" : "taken" };
}

function normalizeRegisteredMedication(raw: unknown): RegisteredMedication {
  const entry = raw as Partial<RegisteredMedication>;
  return {
    ...entry,
    id: entry.id ?? "",
    name: entry.name ?? "",
    dose: entry.dose,
    type: entry.type ?? "regular",
    reminderTime: entry.reminderTime,
    active: entry.active ?? true,
    // 旧データにはstartDate/endDateが無いため、後方互換でundefinedのままにする。
    // isMedicationApplicableOnDate側でundefinedを「いつでも表示可」として扱う
    startDate: entry.startDate,
    endDate: entry.endDate,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

function normalizeTaperingEvent(raw: unknown): TaperingEvent {
  const entry = raw as Partial<TaperingEvent>;
  return {
    ...entry,
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
    ...entry,
    id: entry.id ?? "",
    statement: entry.statement ?? "",
    createdAt: entry.createdAt ?? new Date().toISOString(),
    note: entry.note,
  };
}

function normalizeSelfExperiment(raw: unknown): SelfExperiment {
  const entry = raw as Partial<SelfExperiment>;
  return {
    ...entry,
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
    ...entry,
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
