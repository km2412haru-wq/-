import { migrateToLatest } from "@/lib/migrate";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

const STORAGE_KEY = "vitalog:store";

export function loadStore(): VitalogStore {
  if (typeof window === "undefined") {
    return { version: SCHEMA_VERSION, dailyLogs: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: SCHEMA_VERSION, dailyLogs: [] };
    return migrateToLatest(JSON.parse(raw));
  } catch (err) {
    console.error("Vitalogデータの読み込みに失敗しました:", err);
    return { version: SCHEMA_VERSION, dailyLogs: [] };
  }
}

export function saveStore(store: VitalogStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Vitalogデータの保存に失敗しました:", err);
  }
}

export function loadDailyLogs(): DailyLog[] {
  return loadStore().dailyLogs;
}

export function saveDailyLogs(dailyLogs: DailyLog[]): void {
  saveStore({ version: SCHEMA_VERSION, dailyLogs });
}

/** F8: JSONエクスポート(バックアップ・医師向け提出等の土台) */
export function exportStoreAsJson(): string {
  return JSON.stringify(loadStore(), null, 2);
}
