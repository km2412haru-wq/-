import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadStore, saveStore } from "@/lib/storage";
import { useDailyLogs, type DailyLogDraft } from "@/lib/useDailyLogs";
import { useMedications } from "@/lib/useMedications";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeLog(id: string, targetDate: string): DailyLog {
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

const SEED: VitalogStore = {
  version: SCHEMA_VERSION,
  dailyLogs: [makeLog("L1", "2026-09-01")],
  registeredMedications: [],
  taperingEvents: [],
  hypotheses: [],
  selfExperiments: [],
  visits: [],
};

const DRAFT: DailyLogDraft = {
  targetDate: "2026-09-29",
  skipped: false,
  jointPain: [],
  symptoms: [],
  moodReasonTags: [],
  activityTags: [],
  medications: [],
  topicalMedications: [],
};

let tabs: { container: HTMLDivElement; root: Root }[] = [];

function mountTab<T>(useHook: () => T): { api: () => T } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  tabs.push({ container, root });
  let latest: T;
  function Probe() {
    latest = useHook();
    return null;
  }
  act(() => root.render(<Probe />));
  return { api: () => latest };
}

beforeEach(() => {
  window.localStorage.clear();
  saveStore(SEED);
});
afterEach(() => {
  for (const t of tabs) {
    act(() => t.root.unmount());
    t.container.remove();
  }
  tabs = [];
  vi.restoreAllMocks();
});

describe("2つのタブ(独立したフックインスタンス)が同じ状態から追加しても、記録が消えない", () => {
  it("AとBがそれぞれ追加すると、保存データにも両方の画面にも両方が残る", () => {
    const tabA = mountTab(() => useDailyLogs());
    const tabB = mountTab(() => useDailyLogs());
    act(() => {
      tabB.api().addLog({ ...DRAFT, conditionScore: 1 });
    });
    // Aの画面は古いまま(storageイベントはjsdomでは同一ウィンドウに発火しない)。それでもAの追加で消えない
    act(() => {
      tabA.api().addLog({ ...DRAFT, conditionScore: 2 });
    });
    const scores = loadStore().dailyLogs.map((l) => l.conditionScore);
    expect(scores).toEqual([undefined, 1, 2]);
    expect(tabA.api().dailyLogs).toHaveLength(3);
    expect(tabB.api().dailyLogs).toHaveLength(3);
  });

  it("他のタブが書き換えた時のstorageイベントで、画面の内容が最新になる", () => {
    const tab = mountTab(() => useDailyLogs());
    expect(tab.api().dailyLogs).toHaveLength(1);
    // 別タブが直接保存した状況を再現
    saveStore({ ...SEED, dailyLogs: [...SEED.dailyLogs, makeLog("other-tab", "2026-09-05")] });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "vitalog:store" }));
    });
    expect(tab.api().dailyLogs.map((l) => l.id)).toEqual(["other-tab", "L1"]);
  });

  it("別のキーのstorageイベントでは読み直さない", () => {
    const tab = mountTab(() => useDailyLogs());
    saveStore({ ...SEED, dailyLogs: [...SEED.dailyLogs, makeLog("x", "2026-09-05")] });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));
    });
    expect(tab.api().dailyLogs).toHaveLength(1);
  });

  it("同じタブ内で、別のフックインスタンスの変更も画面に反映される", () => {
    const writer = mountTab(() => useDailyLogs());
    const reader = mountTab(() => useDailyLogs());
    act(() => {
      writer.api().addLog({ ...DRAFT, conditionScore: 7 });
    });
    expect(reader.api().dailyLogs.some((l) => l.conditionScore === 7)).toBe(true);
  });
});

describe("保存に失敗した場合", () => {
  function failSaves() {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === "vitalog:store:temp") throw new Error("quota");
      return original.call(this, k, v);
    });
  }

  it("addLogはnullを返し、保存されていない記録を画面に出さない", () => {
    const tab = mountTab(() => useDailyLogs());
    failSaves();
    let result: DailyLog | null = makeLog("sentinel", "2026-01-01");
    act(() => {
      result = tab.api().addLog({ ...DRAFT, conditionScore: 3 });
    });
    expect(result).toBeNull();
    expect(tab.api().dailyLogs.map((l) => l.id)).toEqual(["L1"]);
    expect(loadStore().dailyLogs.map((l) => l.id)).toEqual(["L1"]);
  });

  it("updateLog・deleteLogはfalseを返し、データを変えない", () => {
    const tab = mountTab(() => useDailyLogs());
    failSaves();
    let updated = true;
    let deleted = true;
    act(() => {
      updated = tab.api().updateLog("L1", { conditionScore: 9 });
      deleted = tab.api().deleteLog("L1");
    });
    expect(updated).toBe(false);
    expect(deleted).toBe(false);
    expect(loadStore().dailyLogs[0].conditionScore).toBeUndefined();
  });
});

describe("記録の順序と薬", () => {
  it("同じ日の記録は追加順のまま、日付の新しい順に並ぶ", () => {
    const tab = mountTab(() => useDailyLogs());
    act(() => {
      tab.api().addLog({ ...DRAFT, targetDate: "2026-09-01", conditionScore: 5 });
    });
    const sameDay = tab.api().dailyLogs.filter((l) => l.targetDate === "2026-09-01");
    expect(sameDay.map((l) => l.conditionScore)).toEqual([undefined, 5]);
  });

  it("薬の追加・更新・削除がid単位で反映される", () => {
    const tab = mountTab(() => useMedications());
    let id = "";
    act(() => {
      id = tab.api().addMedication({ name: "架空薬A", type: "regular" })!.id;
    });
    act(() => {
      tab.api().updateMedication(id, { dose: "1錠" });
    });
    expect(tab.api().registeredMedications[0]).toMatchObject({ name: "架空薬A", dose: "1錠", active: true });
    act(() => {
      tab.api().deleteMedication(id);
    });
    expect(tab.api().registeredMedications).toEqual([]);
  });
});
