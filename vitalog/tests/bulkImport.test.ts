import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyBulkLabResult,
  applyBulkMedication,
  applyPrescriptionToRegisteredMedications,
  discontinueRegisteredMedication,
} from "@/lib/bulkImport";
import { loadStore, saveStore, STORE_CHANGED_EVENT } from "@/lib/storage";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

function makeLog(id: string, targetDate: string, extra: Partial<DailyLog> = {}): DailyLog {
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
    ...extra,
  };
}

function seed(logs: DailyLog[], extra: Partial<VitalogStore> = {}) {
  window.localStorage.clear();
  saveStore({
    version: SCHEMA_VERSION,
    dailyLogs: logs,
    registeredMedications: [],
    taperingEvents: [],
    hypotheses: [],
    selfExperiments: [],
    visits: [],
    ...extra,
  });
}

beforeEach(() => seed([]));

describe("applyBulkLabResult", () => {
  it("記録の無い日には、検査値のみ(labsOnly)の記録を作る", () => {
    expect(applyBulkLabResult("2030-01-10", { wbcPerUl: 5000 })).toBe(true);
    const logs = loadStore().dailyLogs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ targetDate: "2030-01-10", labsOnly: true, labs: { wbcPerUl: 5000 } });
  });

  it("記録のある日には追記し、labsOnlyの印は付けない(他の項目は変えない)", () => {
    seed([makeLog("a", "2030-01-10", { conditionScore: 6 })]);
    applyBulkLabResult("2030-01-10", { astUL: 20 });
    const log = loadStore().dailyLogs[0];
    expect(log.labsOnly).toBeUndefined();
    expect(log.conditionScore).toBe(6);
    expect(log.labs).toEqual({ astUL: 20 });
  });

  it("読み取れなかった項目(undefined)で、既存の検査値を消さない", () => {
    seed([makeLog("a", "2030-01-10", { labs: { wbcPerUl: 5000, astUL: 20 } })]);
    applyBulkLabResult("2030-01-10", { wbcPerUl: undefined, altUL: 15 });
    expect(loadStore().dailyLogs[0].labs).toEqual({ wbcPerUl: 5000, astUL: 20, altUL: 15 });
  });

  it("保存の瞬間に読み直すので、古い画面が持つ配列で他の記録を消さない", () => {
    seed([makeLog("a", "2030-01-01")]);
    const before = loadStore().dailyLogs; // 古い画面が持つ配列(使わない)
    saveStore({ ...loadStore(), dailyLogs: [...before, makeLog("b", "2030-01-02")] }); // 別タブが追加
    applyBulkLabResult("2030-01-03", { crpMgDl: 0.1 });
    expect(loadStore().dailyLogs.map((l) => l.id).filter((id) => id !== "")).toContain("b");
    expect(loadStore().dailyLogs).toHaveLength(3);
  });

  it("保存できたら変更イベントを発火する", () => {
    const handler = vi.fn();
    window.addEventListener(STORE_CHANGED_EVENT, handler);
    applyBulkLabResult("2030-01-10", { wbcPerUl: 1 });
    window.removeEventListener(STORE_CHANGED_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("applyBulkMedication", () => {
  it("対象日の記録に服薬を1件追記する(新規の日はlabsOnly)", () => {
    applyBulkMedication("2030-02-01", { name: "架空薬A", dose: "1錠" });
    const log = loadStore().dailyLogs[0];
    expect(log.medications.map((m) => m.name)).toEqual(["架空薬A"]);
    expect(log.labsOnly).toBe(true);
  });
});

describe("applyPrescriptionToRegisteredMedications", () => {
  it("新規は登録し、開始日を入れる", () => {
    expect(applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-03-01")).toBe("created");
    expect(loadStore().registeredMedications[0]).toMatchObject({ name: "架空薬A", dose: "1錠", active: true, startDate: "2030-03-01" });
  });

  it("同名のactiveな薬で用量が違えば、用量を更新して履歴に残す", () => {
    applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-03-01");
    expect(applyPrescriptionToRegisteredMedications("架空薬A", "2錠", "2030-04-01")).toBe("updated");
    const s = loadStore();
    expect(s.registeredMedications[0].dose).toBe("2錠");
    expect(s.taperingEvents[0]).toMatchObject({ medicationName: "架空薬A", date: "2030-04-01", newDose: "2錠" });
  });

  it("同じ用量なら何も変えない", () => {
    applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-03-01");
    expect(applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-04-01")).toBe("unchanged");
    expect(loadStore().taperingEvents).toHaveLength(0);
  });

  it("中止済みの薬が再処方されたら、新規を作らず再開する", () => {
    applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-03-01");
    discontinueRegisteredMedication("架空薬A", "2030-03-20");
    expect(loadStore().registeredMedications[0]).toMatchObject({ active: false, endDate: "2030-03-20" });
    expect(applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-05-01")).toBe("resumed");
    const meds = loadStore().registeredMedications;
    expect(meds).toHaveLength(1);
    expect(meds[0]).toMatchObject({ active: true, startDate: "2030-05-01" });
    expect(meds[0].endDate).toBeUndefined();
  });

  it("保存に失敗したら 'failed' を返す", () => {
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === "vitalog:store:temp") throw new Error("quota");
      return original.call(this, k, v);
    });
    expect(applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-03-01")).toBe("failed");
    spy.mockRestore();
    expect(loadStore().registeredMedications).toHaveLength(0);
  });
});

describe("discontinueRegisteredMedication", () => {
  it("中止日を入れ、履歴に「中止」を残す。該当が無ければ何もしない", () => {
    applyPrescriptionToRegisteredMedications("架空薬A", "1錠", "2030-03-01");
    expect(discontinueRegisteredMedication("架空薬A", "2030-04-01")).toBe(true);
    const s = loadStore();
    expect(s.registeredMedications[0]).toMatchObject({ active: false, endDate: "2030-04-01" });
    expect(s.taperingEvents[0].newDose).toBe("中止");
    const eventsBefore = s.taperingEvents.length;
    discontinueRegisteredMedication("存在しない薬", "2030-04-02");
    expect(loadStore().taperingEvents).toHaveLength(eventsBefore);
  });
});
