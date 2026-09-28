import { migrateToLatest } from "@/lib/migrate";
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

const STORAGE_KEY = "vitalog:store";
const PRE_RESTORE_SNAPSHOT_KEY = "vitalog:pre-restore-snapshot";

function emptyStore(): VitalogStore {
  return {
    version: SCHEMA_VERSION,
    dailyLogs: [],
    registeredMedications: [],
    taperingEvents: [],
    hypotheses: [],
    selfExperiments: [],
    visits: [],
  };
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

export function loadHypotheses(): Hypothesis[] {
  return loadStore().hypotheses;
}

export function saveHypotheses(hypotheses: Hypothesis[]): void {
  const store = loadStore();
  saveStore({ ...store, hypotheses });
}

export function loadSelfExperiments(): SelfExperiment[] {
  return loadStore().selfExperiments;
}

export function saveSelfExperiments(selfExperiments: SelfExperiment[]): void {
  const store = loadStore();
  saveStore({ ...store, selfExperiments });
}

export function loadVisits(): Visit[] {
  return loadStore().visits;
}

export function saveVisits(visits: Visit[]): void {
  const store = loadStore();
  saveStore({ ...store, visits });
}

/** F8: JSONエクスポート(バックアップ・医師向け提出等の土台) */
export function exportStoreAsJson(): string {
  return JSON.stringify(loadStore(), null, 2);
}

/**
 * F8: 旧データを破棄せず取り込むための復元(常にmigrateToLatestを通す)。
 * 復元は無条件の上書きなので、実行直前の状態を1世代だけ退避してから上書きする
 * (誤操作でおかしなバックアップを復元してしまった場合に restorePreRestoreSnapshot で戻せる)。
 */
export function importStoreFromJson(json: string): VitalogStore {
  if (typeof window !== "undefined") {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      try {
        window.localStorage.setItem(PRE_RESTORE_SNAPSHOT_KEY, current);
      } catch (err) {
        console.error("復元前スナップショットの保存に失敗しました:", err);
      }
    }
  }
  const store = migrateToLatest(JSON.parse(json));
  saveStore(store);
  return store;
}

export function hasPreRestoreSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PRE_RESTORE_SNAPSHOT_KEY) !== null;
}

/** 直前の復元操作で上書きされる前の状態に戻す(1世代のみ) */
export function restorePreRestoreSnapshot(): VitalogStore | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PRE_RESTORE_SNAPSHOT_KEY);
  if (!raw) return null;
  const store = migrateToLatest(JSON.parse(raw));
  saveStore(store);
  window.localStorage.removeItem(PRE_RESTORE_SNAPSHOT_KEY);
  return store;
}
