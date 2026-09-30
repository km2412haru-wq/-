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
/** 直前のloadStoreで復旧または破損検出があったことを示すフラグ(一度だけ通知するため) */
const NOTICE_FLAG_KEY = "vitalog:store:notice-flag";
/**
 * 破損した本キーの生テキストの退避先。復旧できた場合も、復旧できなかった場合も残す。
 * 次の保存で本キーが上書きされても元の文字列を失わないため(手作業での救出に使える)。
 */
const CORRUPT_SNAPSHOT_KEY = "vitalog:store:corrupt-snapshot";

/** 保存に失敗した時にwindowへ発火するイベント名(SaveFailureBannerが購読する) */
export const SAVE_FAILED_EVENT = "vitalog:save-failed";

export type StorageNotice = "recovered" | "unrecoverable";

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

/**
 * ストアとして最低限成立している形かを確認する。
 * `null`・`{}`・`[]`・version違いのように「JSONとしては読めるが中身が壊れている」値を
 * 正常データと誤認しないため。これを通らない値を読み込むとmigrateToLatestが黙って
 * 空のストアを返し、次の保存で全データが消えてしまう。
 */
export function isStoreShape(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as { version?: unknown; dailyLogs?: unknown };
  return v.version === SCHEMA_VERSION && Array.isArray(v.dailyLogs);
}

/** 文字列が「JSONとして読め、かつストアの形をしている」かを確認する(整合性検証用) */
function isValidStoreJson(raw: string | null): raw is string {
  if (raw === null) return false;
  try {
    return isStoreShape(JSON.parse(raw));
  } catch {
    return false;
  }
}

/**
 * 破損した本キーの生テキストを退避する。すでに同じ内容を退避済みならfalseを返す
 * (同じ破損に対して通知を繰り返さないため)。退避に失敗(容量不足など)しても
 * 通知の要否判定には影響させない。
 */
function preserveCorruptSnapshot(raw: string): boolean {
  const existing = window.localStorage.getItem(CORRUPT_SNAPSHOT_KEY);
  if (existing === raw) return false;
  try {
    window.localStorage.setItem(CORRUPT_SNAPSHOT_KEY, raw);
  } catch (err) {
    console.error("破損データの退避に失敗しました:", err);
  }
  return true;
}

function setNoticeFlag(kind: StorageNotice): void {
  try {
    window.localStorage.setItem(NOTICE_FLAG_KEY, kind);
  } catch {
    // フラグを立てられなくても、読み込み自体は続行する
  }
}

/**
 * 破損した本キーからの自動復旧を試みる。
 * 復旧の優先順位:
 *   1. TEMP_KEY … 保存の途中でクラッシュした場合、ここに「書き込もうとしていた最新の状態」が残る
 *   2. BACKUP_KEY … 直前に正常保存できた状態(最後の既知の正常データ)
 * 候補は「JSONとして読め、かつストアの形をしている」ものだけ。
 */
function recoverStore(): VitalogStore | null {
  const temp = window.localStorage.getItem(TEMP_KEY);
  const backup = window.localStorage.getItem(BACKUP_KEY);
  for (const raw of [temp, backup]) {
    if (isValidStoreJson(raw)) {
      try {
        const recovered = migrateToLatest(JSON.parse(raw));
        // 復旧した内容を本キーへ書き戻す(次回以降は正常読み込みになる)
        window.localStorage.setItem(STORAGE_KEY, raw);
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
    const parsed = JSON.parse(raw);
    if (isStoreShape(parsed)) return migrateToLatest(parsed);
    console.error("Vitalogデータの形式が不正です。バックアップからの復旧を試みます。");
  } catch (err) {
    console.error("Vitalogデータの読み込みに失敗しました。バックアップからの復旧を試みます:", err);
  }

  // ここに来るのは本キーが壊れている場合のみ。まず元のテキストを退避してから復旧を試みる
  const isNewCorruption = preserveCorruptSnapshot(raw);
  const recovered = recoverStore();
  if (recovered) {
    setNoticeFlag("recovered");
    return recovered;
  }
  console.error("復旧できるバックアップが見つかりませんでした。");
  if (isNewCorruption) setNoticeFlag("unrecoverable");
  return emptyStore();
}

function notifySaveFailed(): void {
  window.dispatchEvent(new CustomEvent(SAVE_FAILED_EVENT));
}

/**
 * 破損耐性を持たせた保存フロー。localStorage.setItem自体はキー単位でアトミックだが、
 * 想定外の原因で本キー(STORAGE_KEY)が壊れる・消える事態に備えて多重化する。
 *
 * 手順:
 *   1. 保存直前の本キーの値が「JSONとして読め、かつストアの形をしている」なら
 *      BACKUP_KEY へ退避する(壊れた値でbackupを上書きせず、最後の既知の正常データを守る)。
 *      バックアップは補助なので、容量不足などで失敗しても保存自体は続行する
 *   2. 一時キー(TEMP_KEY)へ新データを書き込む
 *   3. TEMP_KEYを読み戻して内容一致と形を検証する(書き込みが健全に完了したことの確認)
 *   4. 検証OKなら本キー(STORAGE_KEY)へ反映し、TEMP_KEYを掃除する
 *   5. 検証NGなら本キーには一切触れない(既存データを守り、次回復旧に備えてTEMPは残す)
 *
 * 保存に失敗した場合はfalseを返し、SAVE_FAILED_EVENTを発火する。呼び出し元の画面は
 * 「保存済み」に見えていても実際には保存されていないため、ユーザーへの通知が必須。
 */
export function saveStore(store: VitalogStore): boolean {
  if (typeof window === "undefined") return true;
  try {
    const json = JSON.stringify(store);

    const current = window.localStorage.getItem(STORAGE_KEY);
    if (isValidStoreJson(current)) {
      try {
        window.localStorage.setItem(BACKUP_KEY, current);
      } catch (err) {
        console.error("バックアップの更新に失敗しました(保存は続行します):", err);
      }
    }

    window.localStorage.setItem(TEMP_KEY, json);
    const writtenBack = window.localStorage.getItem(TEMP_KEY);
    if (writtenBack !== json || !isValidStoreJson(writtenBack)) {
      console.error("保存データの検証に失敗したため、本データへの反映を中止しました。");
      notifySaveFailed();
      return false;
    }

    window.localStorage.setItem(STORAGE_KEY, json);
    window.localStorage.removeItem(TEMP_KEY);
    return true;
  } catch (err) {
    console.error("Vitalogデータの保存に失敗しました:", err);
    notifySaveFailed();
    return false;
  }
}

/**
 * loadStoreが復旧または破損検出をした直後かどうかを確認し、フラグを消費する
 * (アプリ起動時に一度だけユーザーへ通知するため。RecoveryNoticeBanner専用)
 */
export function consumeStorageNotice(): StorageNotice | null {
  if (typeof window === "undefined") return null;
  const flag = window.localStorage.getItem(NOTICE_FLAG_KEY);
  if (flag !== "recovered" && flag !== "unrecoverable") return null;
  window.localStorage.removeItem(NOTICE_FLAG_KEY);
  return flag;
}

/**
 * アプリ起動時の整合性チェック。loadStoreを1回実行して破損の検出・復旧を済ませ、
 * その結果を返す。RecoveryNoticeBannerはlayoutにあり、各ページのデータ読み込みより
 * 先に初期化されるため、これを起動時に自分で呼ばないと通知が次回起動まで遅れる
 * (また、データを読み込まないページでは検出自体が行われない)。
 */
export function verifyStoreOnStartup(): StorageNotice | null {
  if (typeof window === "undefined") return null;
  loadStore();
  return consumeStorageNotice();
}

/** 破損時に退避した元のテキスト(あれば)。手作業での救出用にダウンロードできるようにする */
export function getCorruptSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CORRUPT_SNAPSHOT_KEY);
}

export function clearCorruptSnapshot(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CORRUPT_SNAPSHOT_KEY);
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
  // 形が不正なファイル(`{}`や別アプリのJSON等)を復元すると、空のストアで全データを
  // 上書きしてしまう。何も変更する前に検証して弾く。
  const parsed: unknown = JSON.parse(json);
  if (!isStoreShape(parsed)) {
    throw new Error("バックアップファイルの形式が不正です");
  }
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
  const store = migrateToLatest(parsed);
  if (!saveStore(store)) {
    throw new Error("復元データの保存に失敗しました");
  }
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
