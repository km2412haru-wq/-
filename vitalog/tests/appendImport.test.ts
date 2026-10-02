import { beforeEach, describe, expect, it } from "vitest";
import {
  APPEND_BUNDLE_FORMAT,
  applyAppendImport,
  computeAppendImport,
  getLastImportBatch,
  normalizeMedName,
  parseAppendBundle,
  planAppendImport,
  undoLastAppendImport,
  type AppendBundle,
} from "@/lib/appendImport";
import { loadStore, saveStore } from "@/lib/storage";
import { SCHEMA_VERSION, type DailyLog, type VitalogStore } from "@/types/vitalog";

// 値はすべて架空(実際の検査値・薬・日付は含めない)
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

function seed(partial: Partial<VitalogStore> = {}) {
  window.localStorage.clear();
  saveStore({
    version: SCHEMA_VERSION,
    dailyLogs: [],
    registeredMedications: [],
    taperingEvents: [],
    hypotheses: [],
    selfExperiments: [],
    visits: [],
    ...partial,
  });
}

const BUNDLE: AppendBundle = {
  format: APPEND_BUNDLE_FORMAT,
  labs: [
    { date: "2030-01-10", labs: { wbcPerUl: 5000, astUL: 20 } },
    { date: "2030-02-10", labs: { ferritinNgMl: 80 } },
  ],
  medications: [
    { name: "架空薬A", dose: "1錠", type: "regular", active: true },
    { name: "架空薬B", type: "regular", active: false },
  ],
  taperingEvents: [{ medicationName: "架空薬A", date: "2030-03-01", newDose: "2錠", note: "テスト" }],
};

beforeEach(() => seed());

describe("parseAppendBundle", () => {
  it("正しいファイルを読める", () => {
    const r = parseAppendBundle(JSON.stringify(BUNDLE));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bundle.labs).toHaveLength(2);
  });

  it.each([
    ["JSONでない", "not json"],
    ["配列", "[]"],
    ["formatが違う(バックアップ全体など)", JSON.stringify({ version: 1, dailyLogs: [] })],
    ["日付が不正", JSON.stringify({ ...BUNDLE, labs: [{ date: "2030-13-40", labs: { wbcPerUl: 1 } }] })],
    ["未対応の検査項目", JSON.stringify({ ...BUNDLE, labs: [{ date: "2030-01-01", labs: { foo: 1 } }] })],
    ["値が数値でない", JSON.stringify({ ...BUNDLE, labs: [{ date: "2030-01-01", labs: { wbcPerUl: "5000" } }] })],
    ["値が負", JSON.stringify({ ...BUNDLE, labs: [{ date: "2030-01-01", labs: { wbcPerUl: -1 } }] })],
    ["薬の種別が不正", JSON.stringify({ ...BUNDLE, medications: [{ name: "x", type: "weekly", active: true }] })],
    ["activeが真偽値でない", JSON.stringify({ ...BUNDLE, medications: [{ name: "x", type: "regular", active: "yes" }] })],
    ["薬の開始日が不正", JSON.stringify({ ...BUNDLE, medications: [{ name: "x", type: "regular", active: true, startDate: "2030/01/01" }] })],
    ["用量変更の日付が不正", JSON.stringify({ ...BUNDLE, taperingEvents: [{ medicationName: "x", date: "bad", newDose: "1" }] })],
    ["件数が多すぎる", JSON.stringify({ ...BUNDLE, labs: Array.from({ length: 501 }, () => ({ date: "2030-01-01", labs: { wbcPerUl: 1 } })) })],
  ])("不正なファイルを拒否する: %s", (_name, raw) => {
    expect(parseAppendBundle(raw).ok).toBe(false);
  });

  it("値の無い検査値の行は読み飛ばす", () => {
    const r = parseAppendBundle(JSON.stringify({ ...BUNDLE, labs: [{ date: "2030-01-01", labs: {} }] }));
    expect(r.ok && r.bundle.labs).toEqual([]);
  });
});

describe("planAppendImport / applyAppendImport", () => {
  it("記録の無い日には検査値のみの記録を作り、薬と用量変更を追加する。既存の記録は変えない", () => {
    seed({ dailyLogs: [makeLog("keep", "2030-05-01", { conditionScore: 6 })] });
    const result = applyAppendImport(BUNDLE);
    expect(result.ok).toBe(true);
    const s = loadStore();
    expect(s.dailyLogs.find((l) => l.id === "keep")?.conditionScore).toBe(6);
    const created = s.dailyLogs.filter((l) => l.labsOnly);
    expect(created.map((l) => l.targetDate).sort()).toEqual(["2030-01-10", "2030-02-10"]);
    expect(s.registeredMedications.map((m) => m.name).sort()).toEqual(["架空薬A", "架空薬B"]);
    expect(s.registeredMedications.find((m) => m.name === "架空薬B")?.active).toBe(false);
    expect(s.taperingEvents).toHaveLength(1);
  });

  it("既存の記録がある日は、空の項目だけ追記し、labsOnlyの印は付けない", () => {
    seed({ dailyLogs: [makeLog("a", "2030-01-10", { labs: { astUL: 20 } })] });
    const plan = planAppendImport(loadStore(), BUNDLE);
    expect(plan.items.find((i) => i.label === "2030-01-10")?.status).toBe("merge");
    applyAppendImport(BUNDLE);
    const log = loadStore().dailyLogs.find((l) => l.id === "a")!;
    expect(log.labs).toEqual({ astUL: 20, wbcPerUl: 5000 });
    expect(log.labsOnly).toBeUndefined();
  });

  it("同じ日に違う値がある検査値は衝突として取り込まず、既存の値を変えない", () => {
    seed({ dailyLogs: [makeLog("a", "2030-01-10", { labs: { wbcPerUl: 9999 } })] });
    const plan = planAppendImport(loadStore(), BUNDLE);
    const item = plan.items.find((i) => i.label === "2030-01-10")!;
    expect(item.status).toBe("conflict");
    expect(plan.conflicts).toBe(1);
    applyAppendImport(BUNDLE);
    const log = loadStore().dailyLogs.find((l) => l.id === "a")!;
    expect(log.labs?.wbcPerUl).toBe(9999);
    expect(log.labs?.astUL).toBe(20); // 衝突していない項目は追記される
  });

  it("同じファイルを2回取り込んでも重複しない", () => {
    applyAppendImport(BUNDLE);
    const first = loadStore();
    const second = applyAppendImport(BUNDLE);
    expect(second.ok && second.plan.willChange).toBe(0);
    const s = loadStore();
    expect(s.dailyLogs).toHaveLength(first.dailyLogs.length);
    expect(s.registeredMedications).toHaveLength(first.registeredMedications.length);
    expect(s.taperingEvents).toHaveLength(first.taperingEvents.length);
  });

  it("登録済みの薬は表記ゆれ(全角半角・空白・大文字小文字)を同じ薬として扱い、変更しない", () => {
    seed({ registeredMedications: [{ id: "m", name: "架空 薬Ａ", dose: "9錠", type: "regular", active: true, createdAt: "2030-01-01T00:00:00Z" }] });
    expect(normalizeMedName("架空 薬Ａ")).toBe(normalizeMedName("架空薬A"));
    const plan = planAppendImport(loadStore(), BUNDLE);
    expect(plan.items.find((i) => i.label === "架空薬A")?.status).toBe("conflict"); // 用量が違う
    applyAppendImport(BUNDLE);
    const meds = loadStore().registeredMedications;
    expect(meds.filter((m) => normalizeMedName(m.name) === normalizeMedName("架空薬A"))).toHaveLength(1);
    expect(meds.find((m) => m.id === "m")?.dose).toBe("9錠");
  });

  it("日付や用量を推測で補わない(ファイルに無い開始日・終了日は空のまま)", () => {
    applyAppendImport(BUNDLE);
    const b = loadStore().registeredMedications.find((m) => m.name === "架空薬B")!;
    expect(b.startDate).toBeUndefined();
    expect(b.endDate).toBeUndefined();
    expect(b.dose).toBeUndefined();
  });

  it("保存に失敗したら何も変わらず、取り込み履歴も残らない", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k === "vitalog:store:temp") throw new Error("quota");
      return original.call(this, k, v);
    };
    try {
      const result = applyAppendImport(BUNDLE);
      expect(result.ok).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(loadStore().dailyLogs).toHaveLength(0);
    expect(getLastImportBatch()).toBeNull();
  });

  it("同じ薬・同じ日でも用量が違う変更は、別の記録として追加する(日付だけで重複扱いしない)", () => {
    seed({ taperingEvents: [{ id: "e", medicationName: "架空薬A", date: "2030-03-01", newDose: "1錠", createdAt: "2030-03-01T00:00:00Z" }] });
    applyAppendImport(BUNDLE); // ファイルの用量は「2錠」
    expect(loadStore().taperingEvents.map((e) => e.newDose).sort()).toEqual(["1錠", "2錠"]);
  });

  it("同じ日に通常の記録と検査値のみの記録があれば、通常の記録に追記する", () => {
    seed({
      dailyLogs: [
        makeLog("only", "2030-01-10", { labsOnly: true, labs: { crpMgDl: 0.1 } }),
        makeLog("normal", "2030-01-10", { conditionScore: 5 }),
      ],
    });
    applyAppendImport(BUNDLE);
    const s = loadStore();
    expect(s.dailyLogs.find((l) => l.id === "normal")?.labs?.wbcPerUl).toBe(5000);
    expect(s.dailyLogs.find((l) => l.id === "only")?.labs).toEqual({ crpMgDl: 0.1 });
  });

  it("computeAppendImportは副作用が無い(ストアを書き換えない)", () => {
    const before = JSON.stringify(loadStore());
    computeAppendImport(loadStore(), BUNDLE);
    expect(JSON.stringify(loadStore())).toBe(before);
  });
});

describe("undoLastAppendImport", () => {
  it("追加した検査値のみの記録・薬・用量変更を取り消し、既存の記録は残す", () => {
    seed({ dailyLogs: [makeLog("a", "2030-01-10", { labs: { astUL: 20 } })] });
    applyAppendImport(BUNDLE);
    expect(getLastImportBatch()).not.toBeNull();
    expect(undoLastAppendImport().ok).toBe(true);
    const s = loadStore();
    expect(s.dailyLogs.map((l) => l.id)).toEqual(["a"]);
    expect(s.dailyLogs[0].labs).toEqual({ astUL: 20 }); // 追記された項目だけ消える
    expect(s.registeredMedications).toHaveLength(0);
    expect(s.taperingEvents).toHaveLength(0);
    expect(getLastImportBatch()).toBeNull();
  });

  it("取り込み後に値を変えた項目は消さない", () => {
    seed({ dailyLogs: [makeLog("a", "2030-01-10", { labs: { astUL: 20 } })] });
    applyAppendImport(BUNDLE);
    const store = loadStore();
    saveStore({
      ...store,
      dailyLogs: store.dailyLogs.map((l) => (l.id === "a" ? { ...l, labs: { ...l.labs, wbcPerUl: 4321 } } : l)),
    });
    undoLastAppendImport();
    expect(loadStore().dailyLogs.find((l) => l.id === "a")?.labs?.wbcPerUl).toBe(4321);
  });

  it("取り込みで作った検査値のみの記録でも、あとで服薬記録などが加わっていたら残す", () => {
    applyAppendImport(BUNDLE);
    const store = loadStore();
    const target = store.dailyLogs.find((l) => l.targetDate === "2030-01-10")!;
    saveStore({
      ...store,
      dailyLogs: store.dailyLogs.map((l) =>
        l.id === target.id ? { ...l, medications: [{ id: "x", name: "架空薬A", type: "regular" as const }] } : l
      ),
    });
    undoLastAppendImport();
    expect(loadStore().dailyLogs.some((l) => l.id === target.id)).toBe(true);
    expect(loadStore().dailyLogs.some((l) => l.targetDate === "2030-02-10")).toBe(false);
  });

  it("検査値のみではない通常の記録は、取り込みの取り消しで消えない", () => {
    seed({ dailyLogs: [makeLog("a", "2030-01-10", { conditionScore: 4 })] });
    applyAppendImport(BUNDLE);
    undoLastAppendImport();
    expect(loadStore().dailyLogs.some((l) => l.id === "a")).toBe(true);
  });

  it("取り消せる取り込みが無ければ何もしない", () => {
    expect(undoLastAppendImport().ok).toBe(false);
  });

  it("何も追加しなかった取り込みは台帳に残さない", () => {
    applyAppendImport(BUNDLE);
    applyAppendImport(BUNDLE); // 全部「既にある」
    undoLastAppendImport(); // 1回目の分が戻る
    expect(loadStore().registeredMedications).toHaveLength(0);
  });
});
