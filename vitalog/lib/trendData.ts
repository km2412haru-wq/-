import type { DailyLog } from "@/types/vitalog";
import { isRecordedDay } from "@/lib/logKind";
import { addDaysIso, localTodayIso } from "@/lib/dateUtil";

export type DateRangeKey = "7d" | "30d" | "90d" | "all";

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "7d", label: "7日" },
  { key: "30d", label: "30日" },
  { key: "90d", label: "90日" },
  { key: "all", label: "全期間" },
];

export function filterByRange(logs: DailyLog[], range: DateRangeKey): DailyLog[] {
  const nonSkipped = logs.filter(isRecordedDay);
  if (range === "all") return nonSkipped;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoffStr = addDaysIso(localTodayIso(), -days);

  return nonSkipped.filter((l) => l.targetDate >= cutoffStr);
}

export interface ChartPoint {
  date: string;
  value: number;
}

export function toSeries(logs: DailyLog[], field: "conditionScore" | "moodScore" | "temperature" | "sleepHours"): ChartPoint[] {
  return logs
    .filter((l) => typeof l[field] === "number")
    .map((l) => ({ date: l.targetDate, value: l[field] as number }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function latestValue(logs: DailyLog[], field: "conditionScore" | "moodScore" | "temperature" | "sleepHours"): number | undefined {
  const sorted = [...logs]
    .filter((l) => typeof l[field] === "number")
    .sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1));
  return sorted[0]?.[field] as number | undefined;
}
