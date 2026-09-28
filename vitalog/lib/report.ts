import { JOINT_SITES, type DailyLog } from "@/types/vitalog";

export interface ReportSummary {
  entryCount: number;
  avgConditionScore?: number;
  avgMoodScore?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  jointPainCounts: { site: string; count: number }[];
  soreThroatUnusualDates: string[];
  fatigueUnusualCount: number;
  medicationNames: string[];
  topicalMedicationNames: string[];
  memoEntries: { date: string; memo: string }[];
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
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

  const soreThroatUnusualDates = nonSkipped
    .filter((l) => l.soreThroat?.unusualNote)
    .map((l) => l.targetDate);

  const fatigueUnusualCount = nonSkipped.filter((l) => l.fatigueUnusual).length;

  const medicationNames = Array.from(
    new Set(nonSkipped.flatMap((l) => l.medications.map((m) => m.name)).filter(Boolean))
  );
  const topicalMedicationNames = Array.from(
    new Set(nonSkipped.flatMap((l) => l.topicalMedications.map((t) => t.name)).filter(Boolean))
  );

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
    soreThroatUnusualDates,
    fatigueUnusualCount,
    medicationNames,
    topicalMedicationNames,
    memoEntries,
  };
}
