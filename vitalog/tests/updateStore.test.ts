import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_STORE_REVISION,
  SAVE_FAILED_EVENT,
  STORE_CHANGED_EVENT,
  STORE_READONLY_EVENT,
  importStoreFromJson,
  isStoreNewerThanApp,
  loadStore,
  saveStore,
  updateStore,
} from "@/lib/storage";
import { patchById, removeById, upsertById } from "@/lib/storeOps";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

const MAIN = "vitalog:store";

function makeLog(id: string, targetDate = "2026-09-01"): DailyLog {
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

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("storeOps: id単位の操作", () => {
  it("upsertById: 無ければ先頭、positionで末尾、あれば置き換え", () => {
    const a = makeLog("a");
    const b = makeLog("b");
    expect(upsertById([a], b).map((x) => x.id)).toEqual(["b", "a"]);
    expect(upsertById([a], b, "end").map((x) => x.id)).toEqual(["a", "b"]);
    const a2 = { ...a, conditionScore: 9 };
    const replaced = upsertById([a, b], a2);
    expect(replaced.map((x) => x.id)).toEqual(["a", "b"]);
    expect(replaced[0].conditionScore).toBe(9);
  });

  it("patchById: 存在しないid(別タブで削除済み)は何もしない=復活させない", () => {
    const a = makeLog("a");
    const items = [a];
    expect(patchById(items, "gone", (x) => ({ ...x, conditionScore: 1 }))).toBe(items);
  });

  it("removeById: 存在しないidは何もしない", () => {
    const items = [makeLog("a")];
    expect(removeById(items, "gone")).toBe(items);
    expect(removeById(items, "a")).toEqual([]);
  });
});

describe("updateStore: 保存の瞬間に最新を読み直す", () => {
  it("2つのタブが同じ状態から別々の記録を追加しても、両方が残る(記録単位の上書き消失の再現)", () => {
    saveStore(makeStore([makeLog("L1")]));
    // タブA・タブBは、どちらも「L1だけ」の状態を画面に持っている
    const addFromTabB = () =>
      updateStore((s) => ({ ...s, dailyLogs: upsertById(s.dailyLogs, makeLog("B-new"), "end") }));
    const addFromTabA = () =>
      updateStore((s) => ({ ...s, dailyLogs: upsertById(s.dailyLogs, makeLog("A-new"), "end") }));
    expect(addFromTabB()).toBe(true);
    expect(addFromTabA()).toBe(true);
    expect(loadStore().dailyLogs.map((l) => l.id)).toEqual(["L1", "B-new", "A-new"]);
  });

  it("別タブが削除した記録を、古い画面の更新で復活させない", () => {
    saveStore(makeStore([makeLog("L1"), makeLog("L2")]));
    updateStore((s) => ({ ...s, dailyLogs: removeById(s.dailyLogs, "L2") })); // タブBが削除
    updateStore((s) => ({
      ...s,
      dailyLogs: patchById(s.dailyLogs, "L2", (l) => ({ ...l, conditionScore: 5 })), // 古いタブAが更新
    }));
    expect(loadStore().dailyLogs.map((l) => l.id)).toEqual(["L1"]);
  });

  it("成功したらSTORE_CHANGED_EVENTを発火する", () => {
    const handler = vi.fn();
    window.addEventListener(STORE_CHANGED_EVENT, handler);
    expect(updateStore((s) => s)).toBe(true);
    window.removeEventListener(STORE_CHANGED_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("保存に失敗したらfalseを返し、変更イベントを発火せず、失敗を通知する", () => {
    saveStore(makeStore([makeLog("L1")]));
    const changed = vi.fn();
    const failed = vi.fn();
    window.addEventListener(STORE_CHANGED_EVENT, changed);
    window.addEventListener(SAVE_FAILED_EVENT, failed);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === "vitalog:store:temp") throw new Error("quota");
      return original.call(this, k, v);
    });
    const ok = updateStore((s) => ({ ...s, dailyLogs: upsertById(s.dailyLogs, makeLog("X"), "end") }));
    window.removeEventListener(STORE_CHANGED_EVENT, changed);
    window.removeEventListener(SAVE_FAILED_EVENT, failed);
    expect(ok).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalled();
    expect(loadStore().dailyLogs.map((l) => l.id)).toEqual(["L1"]);
  });
});

describe("未知のフィールドを保持する(古い画面が新しい項目を消さない)", () => {
  it("記録・薬・トップレベルの未知の項目が、読み込み→更新→保存を経ても残る", () => {
    const future = {
      ...makeStore([{ ...makeLog("L1"), futureField: { a: 1 } } as DailyLog]),
      registeredMedications: [
        { id: "m1", name: "薬", type: "regular", active: true, createdAt: "2026-01-01T00:00:00Z", futureMedField: "x" },
      ],
      futureCollection: [{ id: "f1" }],
    };
    window.localStorage.setItem(MAIN, JSON.stringify(future));
    updateStore((s) => ({ ...s, dailyLogs: upsertById(s.dailyLogs, makeLog("L2"), "end") }));
    const raw = JSON.parse(window.localStorage.getItem(MAIN)!);
    expect(raw.dailyLogs[0].futureField).toEqual({ a: 1 });
    expect(raw.registeredMedications[0].futureMedField).toBe("x");
    expect(raw.futureCollection).toEqual([{ id: "f1" }]);
    expect(raw.dailyLogs.map((l: DailyLog) => l.id)).toEqual(["L1", "L2"]);
  });

  it("既知の項目は従来どおり正規化される(欠けた配列は補われ、不正なentryModeは捨てられる)", () => {
    const old = makeStore([{ ...makeLog("L1"), entryMode: "bogus" } as unknown as DailyLog]);
    delete (old.dailyLogs[0] as Partial<DailyLog>).jointPain;
    window.localStorage.setItem(MAIN, JSON.stringify(old));
    const log = loadStore().dailyLogs[0];
    expect(log.jointPain).toEqual([]);
    expect(log.entryMode).toBeUndefined();
  });
});

describe("書き込み世代(storeRevision): 新しい版のデータは古いコードが保存しない", () => {
  it("saveStoreは現在の世代を刻印する", () => {
    saveStore(makeStore([]));
    expect(JSON.parse(window.localStorage.getItem(MAIN)!).storeRevision).toBe(CURRENT_STORE_REVISION);
  });

  it("保存済みデータの世代がこのコードより新しいと、updateStore/saveStoreは書き込まず読み取り専用を通知する", () => {
    const newer = { ...makeStore([makeLog("L1")]), storeRevision: CURRENT_STORE_REVISION + 1 };
    const raw = JSON.stringify(newer);
    window.localStorage.setItem(MAIN, raw);
    const readOnly = vi.fn();
    window.addEventListener(STORE_READONLY_EVENT, readOnly);
    expect(isStoreNewerThanApp()).toBe(true);
    expect(updateStore((s) => ({ ...s, dailyLogs: upsertById(s.dailyLogs, makeLog("X"), "end") }))).toBe(false);
    expect(saveStore(makeStore([]))).toBe(false);
    window.removeEventListener(STORE_READONLY_EVENT, readOnly);
    expect(readOnly).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(MAIN)).toBe(raw); // 一切変わらない
  });

  it("渡されたストアの世代が新しい場合も(保存済みが無くても)保存しない", () => {
    const readOnly = vi.fn();
    window.addEventListener(STORE_READONLY_EVENT, readOnly);
    const ok = saveStore({ ...makeStore([makeLog("L1")]), storeRevision: CURRENT_STORE_REVISION + 1 });
    window.removeEventListener(STORE_READONLY_EVENT, readOnly);
    expect(ok).toBe(false);
    expect(readOnly).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(MAIN)).toBeNull();
  });

  it("世代が現在と同じ・無いデータは通常どおり保存できる", () => {
    window.localStorage.setItem(MAIN, JSON.stringify(makeStore([makeLog("L1")])));
    expect(isStoreNewerThanApp()).toBe(false);
    expect(updateStore((s) => s)).toBe(true);
  });

  it("より新しい世代のバックアップは復元せず、理由を伝えて拒否する", () => {
    window.localStorage.setItem(MAIN, JSON.stringify(makeStore([makeLog("keep")])));
    const newer = JSON.stringify({ ...makeStore([makeLog("new")]), storeRevision: CURRENT_STORE_REVISION + 1 });
    expect(() => importStoreFromJson(newer)).toThrow(/新しい版/);
    expect(loadStore().dailyLogs.map((l) => l.id)).toEqual(["keep"]);
  });
});
