import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeRecoveryNotice,
  loadStore,
  saveStore,
  getStorageKey,
} from "@/lib/storage";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

const MAIN = "vitalog:store";
const TEMP = "vitalog:store:temp";
const BACKUP = "vitalog:store:backup";
const RECOVERED_FLAG = "vitalog:store:recovered-flag";

function makeLog(id: string, targetDate: string, overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id,
    targetDate,
    recordedAt: `${targetDate}T09:00:00Z`,
    skipped: false,
    jointPain: [],
    symptoms: [],
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
    expect(consumeRecoveryNotice()).toBe(false);
  });

  it("正常読み込みでは復旧フラグは立たない", () => {
    saveStore(STORE_A);
    loadStore();
    expect(window.localStorage.getItem(RECOVERED_FLAG)).toBeNull();
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

  it("復旧が起きた時は通知フラグが立ち、consumeRecoveryNoticeは1回だけtrueを返す", () => {
    window.localStorage.setItem(MAIN, "{broken json");
    window.localStorage.setItem(BACKUP, json(STORE_B));
    loadStore();
    expect(consumeRecoveryNotice()).toBe(true);
    expect(consumeRecoveryNotice()).toBe(false);
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
    expect(consumeRecoveryNotice()).toBe(false);
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
