import { JOINT_SITES, type DailyLog } from "@/types/vitalog";

/** 「睡眠不足の翌日は症状が出やすいか」の目安として使う閾値(時間) */
const LOW_SLEEP_THRESHOLD_HOURS = 6;

export interface SleepSymptomCorrelation {
  thresholdHours: number;
  lowSleepDays: number;
  /** 睡眠不足だった日の翌日に何らかの症状があった割合(%)。対象日数が0ならundefined */
  lowSleepFollowedByIssuePercent?: number;
  normalSleepDays: number;
  normalSleepFollowedByIssuePercent?: number;
}

export interface MedicationAdherence {
  name: string;
  taken: number;
  notTaken: number;
  unconfirmed: number;
}

export interface ReportSummary {
  /** 定期薬ごとの服用/未服用/未確認の記録日数(未確認は「飲んでいない」ではなく「確認していない」) */
  medicationAdherence: MedicationAdherence[];
  /** 危険症状(Danger層)が記録された日 */
  dangerSymptomEntries: { date: string; symptoms: string[] }[];
  entryCount: number;
  avgConditionScore?: number;
  avgMoodScore?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  jointPainCounts: { site: string; count: number }[];
  symptomCounts: { name: string; count: number }[];
  symptomUnusualEntries: { date: string; name: string }[];
  fatigueUnusualCount: number;
  sleepCorrelation: SleepSymptomCorrelation;
  medicationNames: string[];
  topicalMedicationNames: string[];
  memoEntries: { date: string; memo: string }[];
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 睡眠不足だった日の翌日と、そうでない日の翌日とで、
 * 何らかの症状(症状記録・関節痛・普段と違う倦怠感のいずれか)があった割合を比較する。
 * 対象日の翌日の記録が無い場合はその日を集計から除く。
 */
function buildSleepCorrelation(logs: DailyLog[]): SleepSymptomCorrelation {
  const byDate = new Map(logs.map((l) => [l.targetDate, l]));
  let lowSleepDays = 0;
  let lowSleepIssueDays = 0;
  let normalSleepDays = 0;
  let normalSleepIssueDays = 0;

  for (const log of logs) {
    if (typeof log.sleepHours !== "number") continue;
    const nextLog = byDate.get(addDays(log.targetDate, 1));
    if (!nextLog) continue;
    const hasIssue =
      nextLog.symptoms.length > 0 || nextLog.jointPain.length > 0 || !!nextLog.fatigueUnusual;
    if (log.sleepHours < LOW_SLEEP_THRESHOLD_HOURS) {
      lowSleepDays += 1;
      if (hasIssue) lowSleepIssueDays += 1;
    } else {
      normalSleepDays += 1;
      if (hasIssue) normalSleepIssueDays += 1;
    }
  }

  return {
    thresholdHours: LOW_SLEEP_THRESHOLD_HOURS,
    lowSleepDays,
    lowSleepFollowedByIssuePercent: lowSleepDays
      ? Math.round((lowSleepIssueDays / lowSleepDays) * 100)
      : undefined,
    normalSleepDays,
    normalSleepFollowedByIssuePercent: normalSleepDays
      ? Math.round((normalSleepIssueDays / normalSleepDays) * 100)
      : undefined,
  };
}

/** F7: 医師向けレポートの元になる集計。生データではなく統計サマリーとして扱う */
export function buildReport(logs: DailyLog[]): ReportSummary {
  const nonSkipped = logs.filter((l) => !l.skipped);

  const conditionScores = nonSkipped
    .map((l) => l.conditionScore)
    .filter((v): v is number => typeof v === "number");
  const moodScores = nonSkipped
    .map((l) => l.moodScore)
    .filter((v): v is number => typeof v === "number");
  const temperatures = nonSkipped
    .map((l) => l.temperature)
    .filter((v): v is number => typeof v === "number");

  const jointPainCounts = JOINT_SITES.map((site) => ({
    site,
    count: nonSkipped.filter((l) => l.jointPain.some((p) => p.site === site)).length,
  })).filter((c) => c.count > 0);

  const symptomNameSet = new Set(nonSkipped.flatMap((l) => l.symptoms.map((s) => s.name)));
  const symptomCounts = Array.from(symptomNameSet)
    .map((name) => ({
      name,
      count: nonSkipped.filter((l) => l.symptoms.some((s) => s.name === name)).length,
    }))
    .filter((c) => c.count > 0);

  const symptomUnusualEntries = nonSkipped.flatMap((l) =>
    l.symptoms.filter((s) => s.unusualNote).map((s) => ({ date: l.targetDate, name: s.name }))
  );

  const fatigueUnusualCount = nonSkipped.filter((l) => l.fatigueUnusual).length;

  const sleepCorrelation = buildSleepCorrelation(nonSkipped);

  const medicationNames = Array.from(
    new Set(nonSkipped.flatMap((l) => l.medications.map((m) => m.name)).filter(Boolean))
  );
  const topicalMedicationNames = Array.from(
    new Set(nonSkipped.flatMap((l) => l.topicalMedications.map((t) => t.name)).filter(Boolean))
  );

  const adherenceByName = new Map<string, MedicationAdherence>();
  for (const l of nonSkipped) {
    for (const m of l.medications) {
      if (m.type !== "regular" || !m.name) continue;
      const row = adherenceByName.get(m.name) ?? {
        name: m.name,
        taken: 0,
        notTaken: 0,
        unconfirmed: 0,
      };
      if (m.intake === "notTaken") row.notTaken += 1;
      else if (m.intake === "unconfirmed") row.unconfirmed += 1;
      else row.taken += 1;
      adherenceByName.set(m.name, row);
    }
  }
  const medicationAdherence = Array.from(adherenceByName.values());

  const dangerSymptomEntries = nonSkipped
    .filter((l) => (l.dangerSymptoms?.length ?? 0) > 0)
    .map((l) => ({ date: l.targetDate, symptoms: l.dangerSymptoms as string[] }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const memoEntries = nonSkipped
    .filter((l) => l.memo)
    .map((l) => ({ date: l.targetDate, memo: l.memo as string }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    entryCount: nonSkipped.length,
    avgConditionScore: average(conditionScores),
    avgMoodScore: average(moodScores),
    temperatureMin: temperatures.length ? Math.min(...temperatures) : undefined,
    temperatureMax: temperatures.length ? Math.max(...temperatures) : undefined,
    jointPainCounts,
    symptomCounts,
    symptomUnusualEntries,
    fatigueUnusualCount,
    sleepCorrelation,
    medicationAdherence,
    dangerSymptomEntries,
    medicationNames,
    topicalMedicationNames,
    memoEntries,
  };
}
