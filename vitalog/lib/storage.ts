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
/** 保存直前の状態を常に退避しておくバックアップキー(本キーが壊れた場合の自動復旧用) */
const BACKUP_KEY = "vitalog:store:backup";
/** 保存の一時キー。本キーへの書き込み前にここへ書いてから本キーへコピーする(2段階保存) */
const TEMP_KEY = "vitalog:store:temp";
/** 直前のloadStoreでバックアップからの自動復旧が発生したことを示すフラグ(一度だけ通知するため) */
const RECOVERY_FLAG_KEY = "vitalog:store:recovered-flag";

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

/** 文字列がJSONとしてparse可能かを確認する(整合性検証用) */
function isValidJson(raw: string | null): raw is string {
  if (raw === null) return false;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * 破損した本キーからの自動復旧を試みる。
 * 復旧の優先順位:
 *   1. TEMP_KEY … 保存の途中でクラッシュした場合、ここに「書き込もうとしていた最新の状態」が残る
 *   2. BACKUP_KEY … 直前に正常保存できた状態(最後の既知の正常データ)
 * どちらかから復旧できたらRECOVERY_FLAG_KEYを立て、次回起動時にユーザーへ通知する。
 */
function recoverStore(): VitalogStore | null {
  const temp = window.localStorage.getItem(TEMP_KEY);
  const backup = window.localStorage.getItem(BACKUP_KEY);
  for (const raw of [temp, backup]) {
    if (isValidJson(raw)) {
      try {
        const recovered = migrateToLatest(JSON.parse(raw));
        // 復旧した内容を本キーへ書き戻す(次回以降は正常読み込みになる)
        window.localStorage.setItem(STORAGE_KEY, raw);
        window.localStorage.setItem(RECOVERY_FLAG_KEY, "1");
        return recovered;
      } catch (err) {
        console.error("復旧候補データのmigrateに失敗しました。次の候補を試みます:", err);
      }
    }
  }
  return null;
}

export function loadStore(): VitalogStore {
  if (typeof window === "undefined") return emptyStore();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return emptyStore();
  try {
    return migrateToLatest(JSON.parse(raw));
  } catch (err) {
    console.error("Vitalogデータの読み込みに失敗しました。バックアップからの復旧を試みます:", err);
    const recovered = recoverStore();
    if (recovered) return recovered;
    console.error("復旧できるバックアップが見つかりませんでした。");
    return emptyStore();
  }
}

/**
 * 破損耐性を持たせた保存フロー。localStorage.setItem自体はキー単位でアトミックだが、
 * 想定外の原因で本キー(STORAGE_KEY)が壊れる・消える事態に備えて多重化する。
 *
 * 手順:
 *   1. 保存直前の本キーの値がparse可能なら BACKUP_KEY へ退避する
 *      (壊れた値でbackupを上書きせず、最後の既知の正常データを守る)
 *   2. 一時キー(TEMP_KEY)へ新データを書き込む
 *   3. TEMP_KEYを読み戻してparse検証する(書き込みが健全に完了したことの確認)
 *   4. 検証OKなら本キー(STORAGE_KEY)へ反映し、TEMP_KEYを掃除する
 *   5. 検証NGなら本キーには一切触れない(既存データを守り、次回復旧に備えてTEMPは残す)
 */
export function saveStore(store: VitalogStore): void {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(store);

    const current = window.localStorage.getItem(STORAGE_KEY);
    if (isValidJson(current)) {
      window.localStorage.setItem(BACKUP_KEY, current);
    }

    window.localStorage.setItem(TEMP_KEY, json);
    const writtenBack = window.localStorage.getItem(TEMP_KEY);
    if (writtenBack !== json || !isValidJson(writtenBack)) {
      console.error("保存データの検証に失敗したため、本データへの反映を中止しました。");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, json);
    window.localStorage.removeItem(TEMP_KEY);
  } catch (err) {
    console.error("Vitalogデータの保存に失敗しました:", err);
  }
}

/**
 * loadStoreがバックアップから自動復旧した直後かどうかを確認し、フラグを消費する
 * (アプリ起動時に一度だけユーザーへ通知するため。RecoveryNoticeBanner専用)
 */
export function consumeRecoveryNotice(): boolean {
  if (typeof window === "undefined") return false;
  const flag = window.localStorage.getItem(RECOVERY_FLAG_KEY);
  if (!flag) return false;
  window.localStorage.removeItem(RECOVERY_FLAG_KEY);
  return true;
}

/** 複数タブ同時編集の検知に使う、本データのlocalStorageキー(storageイベントの識別用) */
export function getStorageKey(): string {
  return STORAGE_KEY;
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
