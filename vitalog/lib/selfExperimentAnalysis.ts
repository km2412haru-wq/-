import type { DailyLog, SelfExperiment } from "@/types/vitalog";

export interface ExperimentComparison {
  beforeAvg?: number;
  duringAvg?: number;
  beforeCount: number;
  duringCount: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * F12-2: 介入期間中の体調スコア平均と、介入直前の同じ日数分の平均を比較する。
 * 統計的な有意差検定はせず、あくまで「ざっくりした前後比較」に留める
 * (サンプル数が少ない個人記録で厳密な検定をしても意味を持ちにくいため)。
 */
export function compareExperiment(logs: DailyLog[], experiment: SelfExperiment): ExperimentComparison {
  const endDate = experiment.endDate ?? todayIso();
  const duration = Math.max(1, daysBetween(experiment.startDate, endDate));
  const beforeStart = shiftDate(experiment.startDate, -duration);

  const nonSkipped = logs.filter((l) => !l.skipped && typeof l.conditionScore === "number");

  const duringLogs = nonSkipped.filter(
    (l) => l.targetDate >= experiment.startDate && l.targetDate <= endDate
  );
  const beforeLogs = nonSkipped.filter(
    (l) => l.targetDate >= beforeStart && l.targetDate < experiment.startDate
  );

  return {
    beforeAvg: average(beforeLogs.map((l) => l.conditionScore as number)),
    duringAvg: average(duringLogs.map((l) => l.conditionScore as number)),
    beforeCount: beforeLogs.length,
    duringCount: duringLogs.length,
  };
}
