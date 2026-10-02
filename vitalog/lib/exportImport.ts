import { exportStoreAsJson, importStoreFromJson, loadStore } from "@/lib/storage";
import type { DailyLog } from "@/types/vitalog";
import { localTodayIso } from "@/lib/dateUtil";

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJsonBackup() {
  const json = exportStoreAsJson();
  const date = localTodayIso();
  downloadBlob(json, `vitalog-backup-${date}.json`, "application/json");
}

const CSV_COLUMNS: (keyof DailyLog | string)[] = [
  "targetDate",
  "skipped",
  "temperature",
  "conditionScore",
  "moodScore",
  "fatigueUnusual",
  "loadLevel",
  "sleepHours",
  "sleepStartTime",
  "productivityScore",
  "environment",
  "activityTags",
  "jointPain",
  "symptoms",
  "dangerSymptoms",
  "soreThroat",
  "medications",
  "topicalMedications",
  "labs",
  "memo",
  "memoTags",
];

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const str =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsvBackup() {
  const { dailyLogs } = loadStore();
  const sorted = [...dailyLogs].sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1));

  const header = CSV_COLUMNS.join(",");
  const rows = sorted.map((log) =>
    CSV_COLUMNS.map((col) => csvEscape((log as unknown as Record<string, unknown>)[col])).join(
      ","
    )
  );
  const csv = [header, ...rows].join("\n");
  const date = localTodayIso();
  downloadBlob(csv, `vitalog-export-${date}.csv`, "text/csv");
}

/** F8: JSONバックアップからの復元。旧バージョンのデータもmigrateToLatestを通して読み込む */
export function restoreFromJsonFile(file: File): Promise<void> {
  return file.text().then((text) => {
    importStoreFromJson(text);
  });
}
