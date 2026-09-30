import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveStore, loadStore } from "@/lib/storage";
import { useDailyLogs, type DailyLogDraft } from "@/lib/useDailyLogs";
import { useMedications } from "@/lib/useMedications";
import { useVisits } from "@/lib/useVisits";
import { useHypotheses } from "@/lib/useHypotheses";
import { useSelfExperiments } from "@/lib/useSelfExperiments";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MAIN = "vitalog:store";

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
  dailyLogs: [makeLog("old-1", "2026-09-01"), makeLog("old-2", "2026-09-02")],
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

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.localStorage.clear();
  saveStore(SEED);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function countMainWrites() {
  const original = Storage.prototype.setItem;
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
    return original.call(this, k, v);
  });
  return () => spy.mock.calls.filter(([k]) => k === MAIN).length;
}

describe("読み込んだだけのフックインスタンスは保存しない", () => {
  function Reader() {
    useDailyLogs();
    useMedications();
    useVisits();
    useHypotheses();
    useSelfExperiments();
    return null;
  }

  it("マウントしてデータを読み込んでも、本キーへの書き込みは発生しない", () => {
    const writes = countMainWrites();
    act(() => root.render(<Reader />));
    expect(writes()).toBe(0);
  });

  it("読み込み専用の利用側がマウントされても、保存済みのデータは変わらない", () => {
    const before = window.localStorage.getItem(MAIN);
    act(() => root.render(<Reader />));
    expect(window.localStorage.getItem(MAIN)).toBe(before);
  });
});

describe("変更したインスタンスだけが保存する", () => {
  it("addLogで追加した記録が保存される", () => {
    let add: (d: DailyLogDraft) => void = () => {};
    function Writer() {
      const { addLog } = useDailyLogs();
      add = addLog;
      return null;
    }
    act(() => root.render(<Writer />));
    act(() => add({ ...DRAFT, conditionScore: 4 }));
    const logs = loadStore().dailyLogs;
    expect(logs).toHaveLength(3);
    expect(logs.some((l) => l.conditionScore === 4)).toBe(true);
  });

  it("追加と同時に、別のフックインスタンスを持つ画面が作り直されても、追加した記録が消えない(簡易保存の再現)", () => {
    // 簡易保存: addLogと同じイベントで、通常フォーム(内部でuseDailyLogsを使う)が作り直される
    let quickSave: () => void = () => {};
    function FormWithHistory() {
      useDailyLogs();
      return null;
    }
    function Page() {
      const { addLog, ready } = useDailyLogs();
      const [showForm, setShowForm] = useState(false);
      quickSave = () => {
        addLog({ ...DRAFT, entryMode: "quick", conditionScore: 2 });
        setShowForm(true);
      };
      return ready && showForm ? <FormWithHistory /> : null;
    }
    act(() => root.render(<Page />));
    act(() => quickSave());
    const logs = loadStore().dailyLogs;
    expect(logs).toHaveLength(3);
    expect(logs.some((l) => l.entryMode === "quick")).toBe(true);
  });

  it("updateLog・deleteLogの変更も保存される", () => {
    let api: ReturnType<typeof useDailyLogs> | null = null;
    function Writer() {
      api = useDailyLogs();
      return null;
    }
    act(() => root.render(<Writer />));
    act(() => api!.updateLog("old-1", { conditionScore: 9 }));
    act(() => api!.deleteLog("old-2"));
    const logs = loadStore().dailyLogs;
    expect(logs.map((l) => l.id)).toEqual(["old-1"]);
    expect(logs[0].conditionScore).toBe(9);
  });

  it("他のフックも、変更したインスタンスの内容が保存される(服薬・通院・仮説・実験)", () => {
    let api: {
      med: ReturnType<typeof useMedications>;
      visit: ReturnType<typeof useVisits>;
      hypo: ReturnType<typeof useHypotheses>;
      exp: ReturnType<typeof useSelfExperiments>;
    } | null = null;
    function Writer() {
      api = { med: useMedications(), visit: useVisits(), hypo: useHypotheses(), exp: useSelfExperiments() };
      return null;
    }
    act(() => root.render(<Writer />));
    act(() => api!.med.addMedication({ name: "A", type: "regular" }));
    act(() => api!.visit.addVisit({ visitDate: "2026-09-10" }));
    act(() => api!.hypo.addHypothesis("仮説"));
    act(() => api!.exp.addExperiment("実験", "2026-09-01"));
    const s = loadStore();
    expect(s.registeredMedications.map((m) => m.name)).toEqual(["A"]);
    expect(s.visits).toHaveLength(1);
    expect(s.hypotheses.map((h) => h.statement)).toEqual(["仮説"]);
    expect(s.selfExperiments.map((e) => e.description)).toEqual(["実験"]);
    expect(s.dailyLogs).toHaveLength(2);
  });
});
