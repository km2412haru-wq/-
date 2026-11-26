import { describe, expect, it } from "vitest";
import {
  QUICK_SCORE_DROP_THRESHOLD,
  evaluateQuickGuidance,
  latestMeasuredTemperature,
  recentMeasuredTemperature,
} from "@/lib/quickCheck";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

const TODAY = "2030-06-10";

function log(date: string, extra: Partial<DailyLog> = {}): DailyLog {
  return {
    id: date + Math.random(),
    targetDate: date,
    recordedAt: `${date}T09:00:00Z`,
    skipped: false,
    jointPain: [],
    symptoms: [],
    moodReasonTags: [],
    activityTags: [],
    medications: [],
    topicalMedications: [],
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    ...extra,
  };
}

const NONE = { fatigueUnusual: false, dangerSymptoms: [] as string[] };
const med = (name: string, active = true): RegisteredMedication => ({
  id: name, name, type: "regular", active, createdAt: "2030-01-01T00:00:00Z",
});

describe("evaluateQuickGuidance: 何もなければ案内しない", () => {
  it("体温・体調スコア・倦怠感・危険症状がいずれも通常なら案内しない", () => {
    const r = evaluateQuickGuidance({ ...NONE, temperature: 36.5, conditionScore: 7 }, [], [], TODAY);
    expect(r).toEqual({ needed: false, reasons: [] });
  });

  it("何も入力していなくても案内しない(測っていない=異常ではない)", () => {
    expect(evaluateQuickGuidance(NONE, [], [], TODAY).needed).toBe(false);
  });
});

describe("危険症状・倦怠感", () => {
  it("危険症状が1つでもあれば案内する(理由に症状名)", () => {
    const r = evaluateQuickGuidance({ ...NONE, dangerSymptoms: ["息苦しさ・呼吸困難"] }, [], [], TODAY);
    expect(r.needed).toBe(true);
    expect(r.reasons.join("")).toContain("息苦しさ");
  });

  it("「普段と違う強い倦怠感」があれば案内する", () => {
    const r = evaluateQuickGuidance({ ...NONE, fatigueUnusual: true }, [], [], TODAY);
    expect(r.needed).toBe(true);
    expect(r.reasons.join("")).toContain("倦怠感");
  });
});

describe("体温: F10と同じ基準(通常38.0℃、解熱・抗炎症薬の服用中は37.5℃)", () => {
  it("通常: 37.9℃は案内しない、38.0℃は案内する(境界を含む)", () => {
    expect(evaluateQuickGuidance({ ...NONE, temperature: 37.9 }, [], [], TODAY).needed).toBe(false);
    const r = evaluateQuickGuidance({ ...NONE, temperature: 38.0 }, [], [], TODAY);
    expect(r.needed).toBe(true);
    expect(r.reasons.join("")).toContain("38");
  });

  it("解熱・抗炎症薬の服用中: 37.4℃は案内しない、37.5℃は案内する", () => {
    const meds = [med("カロナール錠500")];
    expect(evaluateQuickGuidance({ ...NONE, temperature: 37.4 }, [], meds, TODAY).needed).toBe(false);
    expect(evaluateQuickGuidance({ ...NONE, temperature: 37.5 }, [], meds, TODAY).needed).toBe(true);
  });

  it("中止済みの薬では敏感にならない", () => {
    const meds = [med("カロナール錠500", false)];
    expect(evaluateQuickGuidance({ ...NONE, temperature: 37.6 }, [], meds, TODAY).needed).toBe(false);
  });

  it("数値でない体温(NaN・無限大)は無視する", () => {
    expect(evaluateQuickGuidance({ ...NONE, temperature: NaN }, [], [], TODAY).needed).toBe(false);
    expect(evaluateQuickGuidance({ ...NONE, temperature: Infinity }, [], [], TODAY).needed).toBe(false);
  });
});

describe("体調スコアの低下(暫定の目安)", () => {
  const history = [log("2030-06-09", { conditionScore: 8 }), log("2030-06-08", { conditionScore: 7 }), log("2030-06-07", { conditionScore: 6 })];
  // 直近3件の平均 = 7

  it("平均より2以上低ければ案内する(境界を含む)、1.9以内なら案内しない", () => {
    expect(QUICK_SCORE_DROP_THRESHOLD).toBe(2);
    expect(evaluateQuickGuidance({ ...NONE, conditionScore: 5 }, history, [], TODAY).needed).toBe(true);
    expect(evaluateQuickGuidance({ ...NONE, conditionScore: 6 }, history, [], TODAY).needed).toBe(false);
  });

  it("直近3件だけで比べる(それより前の記録は使わない)", () => {
    const old = [...history, log("2030-06-01", { conditionScore: 1 }), log("2030-05-30", { conditionScore: 1 })];
    // 古い低い値を含めると平均が下がり、5でも案内しなくなるはず。直近3件だけなら案内する
    expect(evaluateQuickGuidance({ ...NONE, conditionScore: 5 }, old, [], TODAY).needed).toBe(true);
  });

  it("比較に使える記録が2件未満なら比較しない", () => {
    const one = [log("2030-06-09", { conditionScore: 9 })];
    expect(evaluateQuickGuidance({ ...NONE, conditionScore: 1 }, one, [], TODAY).needed).toBe(false);
  });

  it("スキップ日・検査値のみの日・今日以降の記録・スコア無しの記録は比較に使わない", () => {
    const noise = [
      log("2030-06-09", { conditionScore: 9, skipped: true }),
      log("2030-06-09", { conditionScore: 9, labsOnly: true }),
      log("2030-06-10", { conditionScore: 9 }), // 今日の記録
      log("2030-06-11", { conditionScore: 9 }), // 未来
      log("2030-06-08", {}),
    ];
    expect(evaluateQuickGuidance({ ...NONE, conditionScore: 1 }, noise, [], TODAY).needed).toBe(false);
  });

  it("今日の記録は比較の基準に含めない(今日の低い値で基準が下がらない)", () => {
    const h = [log("2030-06-09", { conditionScore: 8 }), log("2030-06-08", { conditionScore: 8 }), log("2030-06-10", { conditionScore: 2 })];
    expect(evaluateQuickGuidance({ ...NONE, conditionScore: 5 }, h, [], TODAY).needed).toBe(true);
  });

  it("検査値のみの日の体調スコアは、比較の基準に含めない", () => {
    const h = [
      log("2030-06-09", { conditionScore: 1, labsOnly: true }),
      log("2030-06-08", { conditionScore: 8 }),
      log("2030-06-07", { conditionScore: 8 }),
    ];
    expect(evaluateQuickGuidance({ ...NONE, conditionScore: 5 }, h, [], TODAY).needed).toBe(true);
  });

  it("体調スコアを入れていなければ比較しない", () => {
    expect(evaluateQuickGuidance(NONE, history, [], TODAY).needed).toBe(false);
  });

  it("理由には「暫定」と、平均と下がった幅が出る", () => {
    const r = evaluateQuickGuidance({ ...NONE, conditionScore: 4 }, history, [], TODAY);
    expect(r.reasons[0]).toContain("暫定");
    expect(r.reasons[0]).toContain("7");
    expect(r.reasons[0]).toContain("3");
  });
});

describe("複数の理由", () => {
  it("該当する理由を全て並べる", () => {
    const r = evaluateQuickGuidance(
      { temperature: 38.5, fatigueUnusual: true, dangerSymptoms: ["強い動悸"] },
      [],
      [],
      TODAY
    );
    expect(r.reasons).toHaveLength(3);
  });
});

describe("前回の体温(参考表示だけ。入力欄に入れない)", () => {
  it("今日より前で最も新しい測定値を返す。未測定・スキップ・今日の値は使わない", () => {
    const h = [
      log("2030-06-09", { temperature: 36.4 }),
      log("2030-06-08", { temperature: 37.2 }),
      log("2030-06-10", { temperature: 39.0 }),
      log("2030-06-09", { temperature: "unmeasured" }),
      log("2030-06-09", { temperature: 38.0, skipped: true }),
    ];
    expect(latestMeasuredTemperature(h, TODAY)).toEqual({ value: 36.4, date: "2030-06-09" });
  });

  it("スキップした日の体温は、より新しくても使わない", () => {
    const h = [log("2030-06-09", { temperature: 38.0, skipped: true }), log("2030-06-08", { temperature: 37.2 })];
    expect(latestMeasuredTemperature(h, TODAY)).toEqual({ value: 37.2, date: "2030-06-08" });
  });

  it("測定値が無ければnull", () => {
    expect(latestMeasuredTemperature([log("2030-06-09", {})], TODAY)).toBeNull();
  });

  it("14日より古い値は「前回」として出さない(14日前は出す)", () => {
    expect(recentMeasuredTemperature([log("2030-05-27", { temperature: 36.5 })], TODAY)?.value).toBe(36.5); // 14日前
    expect(recentMeasuredTemperature([log("2030-05-26", { temperature: 36.5 })], TODAY)).toBeNull(); // 15日前
  });
});
