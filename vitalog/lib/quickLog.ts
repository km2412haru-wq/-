import { isMedicationApplicableOnDate } from "@/lib/medicationApplicability";
import { UNSPECIFIED_SYMPTOM_NAME } from "@/lib/symptomStats";
import type { DailyLogDraft } from "@/lib/useDailyLogs";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

/** 簡易入力で選んだ症状に付ける強さの既定値(簡易入力では強さを聞かない) */
export const QUICK_DEFAULT_SEVERITY = 3;

export interface QuickLogInput {
  targetDate: string;
  /** 体調スコア。危険症状だけを先に記録する場合は未選択(undefined) */
  conditionScore?: number;
  fatigueUnusual: boolean;
  hasSymptoms: boolean;
  symptomNames: string[];
  dangerSymptoms: string[];
  /** 体温(℃)。任意。未入力はundefined */
  temperature?: number;
}

/**
 * 簡易入力の内容を、通常入力と同じスキーマのDailyLogDraftに変換する。
 * - 定期薬は該当する薬を「未確認」で自動追加する(記録していない=服用した、ではない。
 *   こうしないとレポートの服用状況から、簡易記録の日が見えなくなる)
 * - 症状は強さを聞かないので既定値を入れる(強さを使う集計は簡易記録を除外すること)
 */
export function buildQuickDraft(
  input: QuickLogInput,
  registeredMedications: RegisteredMedication[]
): DailyLogDraft {
  const names = input.hasSymptoms
    ? input.symptomNames.length > 0
      ? input.symptomNames
      : [UNSPECIFIED_SYMPTOM_NAME]
    : [];

  return {
    targetDate: input.targetDate,
    skipped: false,
    entryMode: "quick",
    temperature: input.temperature,
    conditionScore: input.conditionScore,
    jointPain: [],
    symptoms: names.map((name) => ({ name, severity: QUICK_DEFAULT_SEVERITY })),
    dangerSymptoms: input.dangerSymptoms,
    moodReasonTags: [],
    fatigueUnusual: input.fatigueUnusual || undefined,
    activityTags: [],
    medications: registeredMedications
      .filter((m) => m.type === "regular" && isMedicationApplicableOnDate(m, input.targetDate))
      .map((m) => ({
        id: `quick-${m.id}-${input.targetDate}`,
        name: m.name,
        dose: m.dose,
        type: "regular" as const,
        registeredMedicationId: m.id,
        intake: "unconfirmed" as const,
      })),
    topicalMedications: [],
  };
}

/**
 * 簡易入力がカバーする項目。「詳細を追記」ではこれらをフォームにプリフィルするので、
 * 追記後の値(空を含む)が利用者の意図として優先される(例: 倦怠感のチェックを外した)。
 */
const QUICK_COVERED_KEYS = [
  "conditionScore",
  "fatigueUnusual",
  "temperature",
  "symptoms",
  "dangerSymptoms",
] as const;

const OPTIONAL_KEYS = [
  "moodScore",
  "loadLevel",
  "sleepHours",
  "sleepStartTime",
  "productivityScore",
  "environment",
  "rash",
  "lymphNodeSwelling",
  "labs",
  "memo",
  "memoTags",
] as const;

const ARRAY_KEYS = [
  "jointPain",
  "moodReasonTags",
  "activityTags",
  "medications",
  "topicalMedications",
] as const;

/**
 * 簡易記録への「詳細を追記」の保存内容を作る。
 * - 簡易入力がカバーする項目は、追記フォームの値(プリフィル済み)をそのまま採用する
 * - それ以外の項目は、追記側が空なら既存の値を消さずに残す(空欄で既存を上書きしない)
 * - 入力方式は"full"にする。id・作成日時などは呼び出し側(updateLog)が既存のまま保つ
 */
export function mergeAppendedLog(existing: DailyLog, draft: DailyLogDraft): Partial<DailyLog> {
  const merged: Partial<DailyLog> = { ...draft, entryMode: "full", targetDate: existing.targetDate };

  for (const key of OPTIONAL_KEYS) {
    if (draft[key] === undefined && existing[key] !== undefined) {
      (merged as Record<string, unknown>)[key] = existing[key];
    }
  }
  for (const key of ARRAY_KEYS) {
    const d = draft[key] as unknown[] | undefined;
    const e = existing[key] as unknown[] | undefined;
    if ((!d || d.length === 0) && e && e.length > 0) {
      (merged as Record<string, unknown>)[key] = e;
    }
  }
  for (const key of QUICK_COVERED_KEYS) {
    (merged as Record<string, unknown>)[key] = draft[key];
  }
  return merged;
}
