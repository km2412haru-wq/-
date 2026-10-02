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
/** 本データが更新された時に、同じタブ内へ発火するイベント名(各フックが読み直す。他タブはstorageイベント) */
export const STORE_CHANGED_EVENT = "vitalog:store-changed";
/** 本データが、このコードより新しい版で作られていて、保存を止めた時のイベント名 */
export const STORE_READONLY_EVENT = "vitalog:store-readonly";

/**
 * このコードが書き込む世代。データ形式に、古いコードが知らない・消してしまう項目を足した時に上げる。
 * 自分より新しい世代のデータを見つけたら、古いコードは保存せず読み取り専用にする
 * (古い画面が開いたままのPWAや、別端末で作った新しいデータの復元で、新しい項目を消さないため)。
 */
export const CURRENT_STORE_REVISION = 1;

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

function notifyStoreChanged(): void {
  window.dispatchEvent(new CustomEvent(STORE_CHANGED_EVENT));
}

function notifyReadOnly(): void {
  window.dispatchEvent(new CustomEvent(STORE_READONLY_EVENT));
}

function revisionOfRaw(raw: string | null): number {
  if (raw === null) return 0;
  try {
    const v = (JSON.parse(raw) as { storeRevision?: unknown }).storeRevision;
    return typeof v === "number" ? v : 0;
  } catch {
    return 0;
  }
}

/** いま保存されているデータが、このコードより新しい世代か(新しいなら保存してはいけない) */
export function isStoreNewerThanApp(): boolean {
  if (typeof window === "undefined") return false;
  return revisionOfRaw(window.localStorage.getItem(STORAGE_KEY)) > CURRENT_STORE_REVISION;
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
    const current = window.localStorage.getItem(STORAGE_KEY);
    // 保存済み(または渡された)データがこのコードより新しい世代なら、書き込まない。
    // 古いコードの保存で、新しい版が足した項目が消えるのを防ぐ。
    if (
      revisionOfRaw(current) > CURRENT_STORE_REVISION ||
      (store.storeRevision ?? 0) > CURRENT_STORE_REVISION
    ) {
      console.error("データがこのアプリより新しい版で作られているため、保存を止めました。");
      notifyReadOnly();
      return false;
    }
    const json = JSON.stringify({ ...store, storeRevision: CURRENT_STORE_REVISION });

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
 * 保存の瞬間に最新のデータを読み直し、変更を適用して保存する(read-modify-write)。
 *
 * 画面が持っている配列をまるごと書き戻す方式だと、別のタブ・別のフックインスタンスが
 * 直前に保存した記録を、古い配列で上書きして消してしまう。これを避けるため、変更は
 * 「最新のストアに対する、id単位の操作」(lib/storeOps.tsのupsertById等)として表し、
 * 読み直し→適用→保存を同じ同期処理の中で行う。保存手順・破損復旧・失敗通知はsaveStoreのまま。
 *
 * 残る限界: localStorageの読み書きは同期のため、読み直しと書き込みの間に他タブの保存が
 * 入る窓は同一のJSタスク内(実質マイクロ秒)に限られるが、ゼロではない。同じ記録の同じ項目を
 * 別タブで同時に編集した場合は、後の保存が勝つ。
 * 成功すると STORE_CHANGED_EVENT を発火する(同一タブのフックが読み直す)。
 */
export function updateStore(mutator: (store: VitalogStore) => VitalogStore): boolean {
  if (typeof window === "undefined") return true;
  const latest = loadStore();
  const ok = saveStore(mutator(latest));
  if (ok) notifyStoreChanged();
  return ok;
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
  updateStore((store) => ({ ...store, dailyLogs }));
}

export function loadRegisteredMedications(): RegisteredMedication[] {
  return loadStore().registeredMedications;
}

export function saveRegisteredMedications(registeredMedications: RegisteredMedication[]): void {
  updateStore((store) => ({ ...store, registeredMedications }));
}

export function loadTaperingEvents(): TaperingEvent[] {
  return loadStore().taperingEvents;
}

export function saveTaperingEvents(taperingEvents: TaperingEvent[]): void {
  updateStore((store) => ({ ...store, taperingEvents }));
}

export function loadHypotheses(): Hypothesis[] {
  return loadStore().hypotheses;
}

export function saveHypotheses(hypotheses: Hypothesis[]): void {
  updateStore((store) => ({ ...store, hypotheses }));
}

export function loadSelfExperiments(): SelfExperiment[] {
  return loadStore().selfExperiments;
}

export function saveSelfExperiments(selfExperiments: SelfExperiment[]): void {
  updateStore((store) => ({ ...store, selfExperiments }));
}

export function loadVisits(): Visit[] {
  return loadStore().visits;
}

export function saveVisits(visits: Visit[]): void {
  updateStore((store) => ({ ...store, visits }));
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
  const incomingRevision = (parsed as { storeRevision?: unknown }).storeRevision;
  if (typeof incomingRevision === "number" && incomingRevision > CURRENT_STORE_REVISION) {
    throw new Error(
      "このバックアップは、より新しい版のアプリで作られています。アプリを更新(再読み込み)してから復元してください"
    );
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
  notifyStoreChanged();
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
  notifyStoreChanged();
  return store;
}
