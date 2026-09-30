import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAVE_FAILED_EVENT,
  consumeStorageNotice,
  getCorruptSnapshot,
  getStorageKey,
  importStoreFromJson,
  loadStore,
  saveStore,
  verifyStoreOnStartup,
} from "@/lib/storage";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

const MAIN = "vitalog:store";
const TEMP = "vitalog:store:temp";
const BACKUP = "vitalog:store:backup";
const NOTICE_FLAG = "vitalog:store:notice-flag";
const CORRUPT = "vitalog:store:corrupt-snapshot";

function makeLog(id: string, targetDate: string, overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id,
    targetDate,
    recordedAt: `${targetDate}T09:00:00Z`,
    skipped: false,
    jointPain: [],
    symptoms: [],
    dangerSymptoms: [],
    moodReasonTags: [],
    activityTags: [],
    medications: [],
    topicalMedications: [],
    createdAt: `${targetDate}T09:00:00Z`,
    updatedAt: `${targetDate}T09:00:00Z`,
    ...overrides,
  };
}

function makeStore(logs: DailyLog[]): VitalogStore {
  return {
    version: SCHEMA_VERSION,
    dailyLogs: logs,
    registeredMedications: [],
    taperingEvents: [],
    hypotheses: [],
    selfExperiments: [],
    visits: [],
  };
}

const STORE_A = makeStore([makeLog("a", "2026-09-01", { conditionScore: 7 })]);
const STORE_B = makeStore([
  makeLog("a", "2026-09-01", { conditionScore: 7 }),
  makeLog("b", "2026-09-02", { conditionScore: 4 }),
]);
const STORE_C = makeStore([
  makeLog("a", "2026-09-01", { conditionScore: 7 }),
  makeLog("b", "2026-09-02", { conditionScore: 4 }),
  makeLog("c", "2026-09-03", { conditionScore: 2 }),
]);

const json = (s: VitalogStore) => JSON.stringify(s);
const ids = (s: VitalogStore) => s.dailyLogs.map((l) => l.id);

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("正常な保存と読み込み", () => {
  it("保存したデータがそのまま読み込める(往復)", () => {
    saveStore(STORE_B);
    const loaded = loadStore();
    expect(loaded.version).toBe(SCHEMA_VERSION);
    expect(loaded.dailyLogs).toEqual(STORE_B.dailyLogs);
  });

  it("保存後にtempキーは残らない", () => {
    saveStore(STORE_A);
    expect(window.localStorage.getItem(TEMP)).toBeNull();
    expect(window.localStorage.getItem(MAIN)).toBe(json(STORE_A));
  });

  it("初回保存(本キーが無い)時はbackupを作らない", () => {
    saveStore(STORE_A);
    expect(window.localStorage.getItem(BACKUP)).toBeNull();
  });

  it("2回目以降の保存では、直前の本キーの内容がbackupに退避される", () => {
    saveStore(STORE_A);
    saveStore(STORE_B);
    expect(window.localStorage.getItem(BACKUP)).toBe(json(STORE_A));
    expect(window.localStorage.getItem(MAIN)).toBe(json(STORE_B));
    saveStore(STORE_C);
    expect(window.localStorage.getItem(BACKUP)).toBe(json(STORE_B));
  });

  it("データが何も無ければ空のストアを返し、復旧通知も出ない", () => {
    const s = loadStore();
    expect(s.dailyLogs).toEqual([]);
    expect(consumeStorageNotice()).toBeNull();
  });

  it("正常読み込みでは復旧フラグは立たない", () => {
    saveStore(STORE_A);
    loadStore();
    expect(window.localStorage.getItem(NOTICE_FLAG)).toBeNull();
  });
});

describe("tempへの書き込み検証に失敗した場合", () => {
  /** tempキーへの書き込みだけ内容を壊す(読み戻し時に不一致になる)ようにsetItemを差し替える */
  function corruptTempWrites() {
    const original = Storage.prototype.setItem;
    return vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, key: string, value: string) {
        original.call(this, key, key === TEMP ? value.slice(0, Math.floor(value.length / 2)) : value);
      });
  }

  it("本キーは一切変更されない", () => {
    saveStore(STORE_A);
    const before = window.localStorage.getItem(MAIN);
    corruptTempWrites();
    saveStore(STORE_B);
    expect(window.localStorage.getItem(MAIN)).toBe(before);
    expect(ids(loadStore())).toEqual(["a"]);
  });

  it("エラーはconsoleに記録され、例外は外に漏れない", () => {
    saveStore(STORE_A);
    corruptTempWrites();
    expect(() => saveStore(STORE_B)).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it("tempへの書き込み自体が例外(容量超過など)になっても本キーは変更されない", () => {
    saveStore(STORE_A);
    const before = window.localStorage.getItem(MAIN);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === TEMP) throw new DOMException("quota", "QuotaExceededError");
      original.call(this, key, value);
    });
    expect(() => saveStore(STORE_B)).not.toThrow();
    expect(window.localStorage.getItem(MAIN)).toBe(before);
  });
});

describe("本キーが破損している状態からの起動(自動復旧)", () => {
  it("temp・backupの両方が有効ならtemp(より新しい方)から復旧する", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(TEMP, json(STORE_C));
    window.localStorage.setItem(BACKUP, json(STORE_B));
    const s = loadStore();
    expect(ids(s)).toEqual(["a", "b", "c"]);
  });

  it("tempが壊れていればbackupから復旧する", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(TEMP, '{"version":1,"dailyLogs":[');
    window.localStorage.setItem(BACKUP, json(STORE_B));
    expect(ids(loadStore())).toEqual(["a", "b"]);
  });

  it("tempが無ければbackupから復旧する", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    expect(ids(loadStore())).toEqual(["a", "b"]);
  });

  it("復旧に成功すると本キーが復旧内容で書き戻され、次回以降は正常に読める", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    loadStore();
    expect(window.localStorage.getItem(MAIN)).toBe(json(STORE_B));
    expect(ids(loadStore())).toEqual(["a", "b"]);
  });

  it("復旧が起きた時は通知フラグが立ち、consumeStorageNoticeは1回だけ\"recovered\"を返す", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    loadStore();
    expect(consumeStorageNotice()).toBe("recovered");
    expect(consumeStorageNotice()).toBeNull();
  });

  it("本キーが空文字列でも壊れたデータとして復旧を試みる", () => {
    window.localStorage.setItem(MAIN, "");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    expect(ids(loadStore())).toEqual(["a", "b"]);
  });

  it("復旧できるものが何も無い場合は空のストアを返し、例外は投げない", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    expect(() => loadStore()).not.toThrow();
    expect(loadStore().dailyLogs).toEqual([]);
  });

  it("tempもbackupも壊れている場合は空のストアを返す", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(TEMP, "{x");
    window.localStorage.setItem(BACKUP, "{y");
    expect(loadStore().dailyLogs).toEqual([]);
  });
});

describe("保存直前の本キーが壊れている場合、backupを守る", () => {
  it("壊れた本キーでは正常なbackupを上書きしない", () => {
    window.localStorage.setItem(BACKUP, json(STORE_A));
    window.localStorage.setItem(MAIN, "{broken json");
    saveStore(STORE_B);
    expect(window.localStorage.getItem(BACKUP)).toBe(json(STORE_A));
    expect(window.localStorage.getItem(MAIN)).toBe(json(STORE_B));
  });

  it("本キーが正常ならbackupは更新される(対照)", () => {
    window.localStorage.setItem(BACKUP, json(STORE_A));
    window.localStorage.setItem(MAIN, json(STORE_B));
    saveStore(STORE_C);
    expect(window.localStorage.getItem(BACKUP)).toBe(json(STORE_B));
  });

  it("破損→保存→再度破損しても、最後の正常データ(backup)から復旧できる", () => {
    saveStore(STORE_A);
    saveStore(STORE_B); // backup = A, main = B
    window.localStorage.setItem(MAIN, "{broken json");
    saveStore(STORE_C); // 壊れたmainではbackupを更新しない: backup = A のまま
    window.localStorage.setItem(MAIN, "{broken again");
    expect(ids(loadStore())).toEqual(["a"]);
  });
});

describe("StoreSyncBanner用のキー", () => {
  it("getStorageKeyは本データのキーを返す", () => {
    expect(getStorageKey()).toBe(MAIN);
  });
});

describe("穴1: JSONとしては読めるが形が壊れている本キー", () => {
  const BAD_SHAPES = ["null", "{}", "[]", '"text"', "123", '{"version":2,"dailyLogs":[]}', '{"version":1}'];

  it.each(BAD_SHAPES)("本キーが %s の場合はbackupから復旧する", (bad) => {
    window.localStorage.setItem(MAIN, bad);
    window.localStorage.setItem(BACKUP, json(STORE_B));
    expect(ids(loadStore())).toEqual(["a", "b"]);
    expect(consumeStorageNotice()).toBe("recovered");
  });

  it.each(BAD_SHAPES)("本キーが %s の場合、tempの形も不正ならbackupを使う", (bad) => {
    window.localStorage.setItem(MAIN, bad);
    window.localStorage.setItem(TEMP, "{}");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    expect(ids(loadStore())).toEqual(["a", "b"]);
  });

  it("形が不正な本キーでは、正常なbackupを上書きしない", () => {
    window.localStorage.setItem(BACKUP, json(STORE_A));
    window.localStorage.setItem(MAIN, "{}");
    saveStore(STORE_B);
    expect(window.localStorage.getItem(BACKUP)).toBe(json(STORE_A));
  });

  it("形が正しい本キーは、内容が空(dailyLogsが空配列)でも正常データとして扱い復旧しない", () => {
    window.localStorage.setItem(MAIN, json(makeStore([])));
    window.localStorage.setItem(BACKUP, json(STORE_B));
    expect(loadStore().dailyLogs).toEqual([]);
    expect(consumeStorageNotice()).toBeNull();
  });

  it("形が不正なファイルの復元は、何も変更せずに拒否される", () => {
    saveStore(STORE_B);
    const before = window.localStorage.getItem(MAIN);
    expect(() => importStoreFromJson("{}")).toThrow();
    expect(() => importStoreFromJson("null")).toThrow();
    expect(window.localStorage.getItem(MAIN)).toBe(before);
    expect(window.localStorage.getItem("vitalog:pre-restore-snapshot")).toBeNull();
  });

  it("正しい形のファイルは復元できる", () => {
    saveStore(STORE_A);
    importStoreFromJson(json(STORE_C));
    expect(ids(loadStore())).toEqual(["a", "b", "c"]);
  });
});

describe("穴2: 復旧不能な破損時に元データを残して通知する", () => {
  it("復旧できない時、破損した元のテキストがそのまま退避される", () => {
    window.localStorage.setItem(MAIN, "{corrupt-but-maybe-salvageable");
    loadStore();
    expect(getCorruptSnapshot()).toBe("{corrupt-but-maybe-salvageable");
  });

  it("復旧できない時は\"unrecoverable\"の通知フラグが立つ", () => {
    window.localStorage.setItem(MAIN, "{corrupt");
    expect(loadStore().dailyLogs).toEqual([]);
    expect(consumeStorageNotice()).toBe("unrecoverable");
  });

  it("その後に保存して本キーが上書きされても、退避したテキストは残る", () => {
    window.localStorage.setItem(MAIN, "{corrupt-but-maybe-salvageable");
    saveStore(loadStore());
    saveStore(STORE_A);
    expect(getCorruptSnapshot()).toBe("{corrupt-but-maybe-salvageable");
    expect(window.localStorage.getItem(MAIN)).toBe(json(STORE_A));
  });

  it("復旧できた場合も、破損した元のテキストは退避される", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    loadStore();
    expect(getCorruptSnapshot()).toBe("{broken json");
  });

  it("同じ破損に対して、読み込みのたびに通知を繰り返さない", () => {
    window.localStorage.setItem(MAIN, "{corrupt");
    loadStore();
    expect(consumeStorageNotice()).toBe("unrecoverable");
    loadStore();
    loadStore();
    expect(consumeStorageNotice()).toBeNull();
  });

  it("別の内容で再び破損したら、改めて通知する", () => {
    window.localStorage.setItem(MAIN, "{corrupt-1");
    loadStore();
    consumeStorageNotice();
    window.localStorage.setItem(MAIN, "{corrupt-2");
    loadStore();
    expect(consumeStorageNotice()).toBe("unrecoverable");
    expect(getCorruptSnapshot()).toBe("{corrupt-2");
  });

  it("本キーが存在しない(初回起動)場合は破損扱いにせず、通知も出ない", () => {
    expect(loadStore().dailyLogs).toEqual([]);
    expect(getCorruptSnapshot()).toBeNull();
    expect(consumeStorageNotice()).toBeNull();
  });
});

describe("穴3: 保存の失敗がアプリ側に伝わる", () => {
  function listenSaveFailed() {
    const handler = vi.fn();
    window.addEventListener(SAVE_FAILED_EVENT, handler);
    return { handler, stop: () => window.removeEventListener(SAVE_FAILED_EVENT, handler) };
  }

  it("保存に成功したらtrueを返し、失敗イベントは発火しない", () => {
    const l = listenSaveFailed();
    expect(saveStore(STORE_A)).toBe(true);
    expect(l.handler).not.toHaveBeenCalled();
    l.stop();
  });

  it("tempへの書き込みが容量超過で失敗したらfalseを返し、失敗イベントを発火する", () => {
    saveStore(STORE_A);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === TEMP) throw new DOMException("quota", "QuotaExceededError");
      original.call(this, key, value);
    });
    const l = listenSaveFailed();
    expect(saveStore(STORE_B)).toBe(false);
    expect(l.handler).toHaveBeenCalledTimes(1);
    expect(ids(loadStore())).toEqual(["a"]);
    l.stop();
  });

  it("読み戻し検証に失敗した場合もfalseを返し、失敗イベントを発火する", () => {
    saveStore(STORE_A);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      original.call(this, key, key === TEMP ? value.slice(0, 10) : value);
    });
    const l = listenSaveFailed();
    expect(saveStore(STORE_B)).toBe(false);
    expect(l.handler).toHaveBeenCalledTimes(1);
    l.stop();
  });

  it("本キーへの書き込みが失敗した場合もfalseを返し、失敗イベントを発火する", () => {
    saveStore(STORE_A);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === MAIN) throw new DOMException("quota", "QuotaExceededError");
      original.call(this, key, value);
    });
    const l = listenSaveFailed();
    expect(saveStore(STORE_B)).toBe(false);
    expect(l.handler).toHaveBeenCalledTimes(1);
    l.stop();
  });

  it("バックアップの更新だけが失敗しても、本データの保存は続行して成功する", () => {
    saveStore(STORE_A);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === BACKUP) throw new DOMException("quota", "QuotaExceededError");
      original.call(this, key, value);
    });
    const l = listenSaveFailed();
    expect(saveStore(STORE_B)).toBe(true);
    expect(l.handler).not.toHaveBeenCalled();
    expect(ids(loadStore())).toEqual(["a", "b"]);
    l.stop();
  });

  it("復元処理中の保存失敗は例外として呼び出し元(バックアップ画面)に伝わる", () => {
    saveStore(STORE_A);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === TEMP) throw new DOMException("quota", "QuotaExceededError");
      original.call(this, key, value);
    });
    expect(() => importStoreFromJson(json(STORE_C))).toThrow();
  });
});

describe("起動時の整合性チェック(verifyStoreOnStartup)", () => {
  it("データを読み込む前でも、破損を検出して復旧し、その結果を返す", () => {
    window.localStorage.setItem(MAIN, "{}");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    expect(verifyStoreOnStartup()).toBe("recovered");
    expect(window.localStorage.getItem(MAIN)).toBe(json(STORE_B));
  });

  it("復旧できない破損は\"unrecoverable\"を返す", () => {
    window.localStorage.setItem(MAIN, "{corrupt");
    expect(verifyStoreOnStartup()).toBe("unrecoverable");
  });

  it("正常なデータ・初回起動では何も返さない", () => {
    expect(verifyStoreOnStartup()).toBeNull();
    saveStore(STORE_A);
    expect(verifyStoreOnStartup()).toBeNull();
  });

  it("通知は1回だけ(2回目の起動チェックでは返さない)", () => {
    window.localStorage.setItem(MAIN, "{corrupt");
    verifyStoreOnStartup();
    expect(verifyStoreOnStartup()).toBeNull();
  });
});
