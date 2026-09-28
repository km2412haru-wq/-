import { migrateToLatest } from "@/lib/migrate";
import {
  SCHEMA_VERSION,
  type DailyLog,
  type RegisteredMedication,
  type TaperingEvent,
  type VitalogStore,
} from "@/types/vitalog";

const STORAGE_KEY = "vitalog:store";

function emptyStore(): VitalogStore {
  return { version: SCHEMA_VERSION, dailyLogs: [], registeredMedications: [], taperingEvents: [] };
}

export function loadStore(): VitalogStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return migrateToLatest(JSON.parse(raw));
  } catch (err) {
    console.error("Vitalogデータの読み込みに失敗しました:", err);
    return emptyStore();
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
  const store = loadStore();
  saveStore({ ...store, dailyLogs });
}

export function loadRegisteredMedications(): RegisteredMedication[] {
  return loadStore().registeredMedications;
}

export function saveRegisteredMedications(registeredMedications: RegisteredMedication[]): void {
  const store = loadStore();
  saveStore({ ...store, registeredMedications });
}

export function loadTaperingEvents(): TaperingEvent[] {
  return loadStore().taperingEvents;
}

export function saveTaperingEvents(taperingEvents: TaperingEvent[]): void {
  const store = loadStore();
  saveStore({ ...store, taperingEvents });
}

/** F8: JSONエクスポート(バックアップ・医師向け提出等の土台) */
export function exportStoreAsJson(): string {
  return JSON.stringify(loadStore(), null, 2);
}

/** F8: 旧データを破棄せず取り込むための復元(常にmigrateToLatestを通す) */
export function importStoreFromJson(json: string): VitalogStore {
  const store = migrateToLatest(JSON.parse(json));
  saveStore(store);
  return store;
}
