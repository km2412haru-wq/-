import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

const transitionMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/lib/lifeStage", () => ({ isInLifeStageTransitionWindow: transitionMock }));

import { buildQuickDraft, mergeAppendedLog, QUICK_DEFAULT_SEVERITY } from "@/lib/quickLog";
import { UNSPECIFIED_SYMPTOM_NAME, computeSymptomChips } from "@/lib/symptomStats";
import { checkEmergency } from "@/lib/emergencyCheck";
import { computeLagCorrelations } from "@/lib/correlationAnalysis";
import { buildReport } from "@/lib/report";
import { migrateToLatest } from "@/lib/migrate";

const TODAY = "2026-09-29";

function dateAgo(daysAgo: number): string {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function makeLog(daysAgo: number, overrides: Partial<DailyLog> = {}): DailyLog {
  const targetDate = dateAgo(daysAgo);
  return {
    id: `log-${daysAgo}`,
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

function med(id: string, overrides: Partial<RegisteredMedication> = {}): RegisteredMedication {
  return { id, name: `薬${id}`, type: "regular", active: true, createdAt: "2020-01-01T00:00:00Z", ...overrides };
}

const BASE_INPUT = {
  targetDate: TODAY,
  conditionScore: 2,
  fatigueUnusual: false,
  hasSymptoms: false,
  symptomNames: [] as string[],
  dangerSymptoms: [] as string[],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  transitionMock.mockReturnValue(false);
});
afterEach(() => vi.useRealTimers());

describe("簡易入力の保存内容(buildQuickDraft)", () => {
  it("通常入力と同じスキーマで、entryModeが\"quick\"、スキップではない", () => {
    const d = buildQuickDraft(BASE_INPUT, []);
    expect(d.entryMode).toBe("quick");
    expect(d.skipped).toBe(false);
    expect(d.targetDate).toBe(TODAY);
    expect(d.conditionScore).toBe(2);
    expect(d.jointPain).toEqual([]);
    expect(d.moodReasonTags).toEqual([]);
    expect(d.activityTags).toEqual([]);
    expect(d.topicalMedications).toEqual([]);
    expect(d.symptoms).toEqual([]);
    expect(d.dangerSymptoms).toEqual([]);
  });

  it("倦怠感はチェック時だけtrue、外していればundefined(通常入力と同じ表現)", () => {
    expect(buildQuickDraft({ ...BASE_INPUT, fatigueUnusual: true }, []).fatigueUnusual).toBe(true);
    expect(buildQuickDraft(BASE_INPUT, []).fatigueUnusual).toBeUndefined();
  });

  it("症状「あり」で選んだ症状名は、既定の強さで記録される", () => {
    const d = buildQuickDraft({ ...BASE_INPUT, hasSymptoms: true, symptomNames: ["頭痛", "咽頭痛"] }, []);
    expect(d.symptoms).toEqual([
      { name: "頭痛", severity: QUICK_DEFAULT_SEVERITY },
      { name: "咽頭痛", severity: QUICK_DEFAULT_SEVERITY },
    ]);
  });

  it("症状「あり」だけで症状名を選ばなかった場合は、詳細未入力の症状として記録する(「なし」にしない)", () => {
    const d = buildQuickDraft({ ...BASE_INPUT, hasSymptoms: true }, []);
    expect(d.symptoms.map((s) => s.name)).toEqual([UNSPECIFIED_SYMPTOM_NAME]);
  });

  it("症状「なし」なら、症状名が残っていても記録しない", () => {
    const d = buildQuickDraft({ ...BASE_INPUT, hasSymptoms: false, symptomNames: ["頭痛"] }, []);
    expect(d.symptoms).toEqual([]);
  });

  it("危険症状と体温はそのまま保存される", () => {
    const d = buildQuickDraft({ ...BASE_INPUT, dangerSymptoms: ["強い動悸"], temperature: 37.8 }, []);
    expect(d.dangerSymptoms).toEqual(["強い動悸"]);
    expect(d.temperature).toBe(37.8);
  });

  it("体調スコア未選択でも(危険症状を先に記録する場合)保存内容を作れる", () => {
    const d = buildQuickDraft({ ...BASE_INPUT, conditionScore: undefined, dangerSymptoms: ["胸痛・胸部圧迫感"] }, []);
    expect(d.conditionScore).toBeUndefined();
    expect(d.dangerSymptoms).toEqual(["胸痛・胸部圧迫感"]);
  });

  it("該当する定期薬は「未確認」で自動追加される(服用したことにはしない)", () => {
    const d = buildQuickDraft(BASE_INPUT, [med("1", { dose: "5mg" }), med("2")]);
    expect(d.medications).toHaveLength(2);
    expect(d.medications.every((m) => m.intake === "unconfirmed")).toBe(true);
    expect(d.medications[0]).toMatchObject({ name: "薬1", dose: "5mg", type: "regular", registeredMedicationId: "1" });
  });

  it("頓服・処方開始前・中止後の薬は自動追加しない", () => {
    const d = buildQuickDraft(BASE_INPUT, [
      med("prn", { type: "asNeeded" }),
      med("future", { startDate: dateAgo(-3) }),
      med("stopped", { endDate: dateAgo(3), active: false }),
      med("ok"),
    ]);
    expect(d.medications.map((m) => m.registeredMedicationId)).toEqual(["ok"]);
  });
});

describe("詳細の追記(mergeAppendedLog)", () => {
  const existing = makeLog(0, {
    entryMode: "quick",
    conditionScore: 2,
    fatigueUnusual: true,
    temperature: 37.6,
    symptoms: [{ name: "頭痛", severity: 3 }],
    dangerSymptoms: ["強い動悸"],
    memo: "つらい",
  });
  const emptyFullDraft = {
    targetDate: TODAY,
    skipped: false,
    jointPain: [],
    symptoms: [],
    dangerSymptoms: [],
    moodReasonTags: [],
    activityTags: [],
    medications: [],
    topicalMedications: [],
  };

  it("追記すると入力方式が\"full\"になり、対象日は既存のまま保たれる", () => {
    const m = mergeAppendedLog(existing, { ...emptyFullDraft, targetDate: "2000-01-01" });
    expect(m.entryMode).toBe("full");
    expect(m.targetDate).toBe(existing.targetDate);
  });

  it("簡易入力でカバーした項目は、追記側の値(空を含む)が優先される: 倦怠感のチェックを外せる", () => {
    const m = mergeAppendedLog(existing, { ...emptyFullDraft, conditionScore: 5, fatigueUnusual: undefined });
    expect(m.fatigueUnusual).toBeUndefined();
    expect(m.conditionScore).toBe(5);
  });

  it("追記側の入力にキー自体が無い場合も、簡易入力でカバーした項目は既存の値が残らず空になる", () => {
    // updateLogは{...既存, ...変更}で合成するため、変更側にキーが無いと既存の値が残ってしまう
    const m = mergeAppendedLog(existing, { ...emptyFullDraft });
    for (const key of ["conditionScore", "fatigueUnusual", "temperature"]) {
      expect(Object.prototype.hasOwnProperty.call(m, key)).toBe(true);
      expect((m as Record<string, unknown>)[key]).toBeUndefined();
    }
    const applied = { ...existing, ...m };
    expect(applied.fatigueUnusual).toBeUndefined();
    expect(applied.symptoms).toEqual([]);
  });

  it("簡易入力でカバーした項目は、追記側で空にした症状・危険症状・体温も反映される", () => {
    const m = mergeAppendedLog(existing, { ...emptyFullDraft, temperature: undefined });
    expect(m.symptoms).toEqual([]);
    expect(m.dangerSymptoms).toEqual([]);
    expect(m.temperature).toBeUndefined();
  });

  it("カバー外の項目は、追記側が空なら既存の値を消さない", () => {
    const e = { ...existing, moodScore: 4, sleepHours: 5, memo: "つらい", loadLevel: "過密" as const, activityTags: ["仕事"] };
    const m = mergeAppendedLog(e, { ...emptyFullDraft });
    expect(m.moodScore).toBe(4);
    expect(m.sleepHours).toBe(5);
    expect(m.memo).toBe("つらい");
    expect(m.loadLevel).toBe("過密");
    expect(m.activityTags).toEqual(["仕事"]);
  });

  it("カバー外の項目は、追記側に値があればそちらが優先される", () => {
    const m = mergeAppendedLog(
      { ...existing, moodScore: 4 },
      { ...emptyFullDraft, moodScore: 7, jointPain: [{ site: "膝", severity: 3 }], memo: "追記" }
    );
    expect(m.moodScore).toBe(7);
    expect(m.jointPain).toEqual([{ site: "膝", severity: 3 }]);
    expect(m.memo).toBe("追記");
  });

  it("追記側の服薬(未確認の自動追加分を含む)が空でなければ採用され、既存の服薬記録は空で消えない", () => {
    const withMeds = { ...existing, medications: [{ id: "m", name: "A", type: "regular" as const, intake: "unconfirmed" as const }] };
    expect(mergeAppendedLog(withMeds, { ...emptyFullDraft }).medications).toEqual(withMeds.medications);
    const draftMeds = [{ id: "n", name: "A", type: "regular" as const, intake: "taken" as const }];
    expect(mergeAppendedLog(withMeds, { ...emptyFullDraft, medications: draftMeds }).medications).toEqual(draftMeds);
  });
});

describe("症状チップの頻度集計(symptomStats)", () => {
  it("「詳細未入力」の症状は頻度集計・チップ・入力候補に混ざらない", () => {
    const logs = [0, 1, 2].map((d) => makeLog(d, { symptoms: [{ name: UNSPECIFIED_SYMPTOM_NAME, severity: 3 }] }));
    const r = computeSymptomChips(logs);
    expect(r.frequency[UNSPECIFIED_SYMPTOM_NAME]).toBeUndefined();
    expect(r.chipNames).not.toContain(UNSPECIFIED_SYMPTOM_NAME);
    expect(r.suggestions).not.toContain(UNSPECIFIED_SYMPTOM_NAME);
  });

  it("既定候補が頻度順に並び、2回以上の自由入力は常設チップに昇格、1回は入力候補になる", () => {
    const logs = [
      makeLog(0, { symptoms: [{ name: "腹痛", severity: 2 }, { name: "めまい", severity: 2 }] }),
      makeLog(1, { symptoms: [{ name: "腹痛", severity: 2 }, { name: "めまい", severity: 2 }, { name: "耳鳴り", severity: 1 }] }),
      makeLog(2, { symptoms: [{ name: "腹痛", severity: 2 }] }),
    ];
    const r = computeSymptomChips(logs);
    expect(r.chipNames[0]).toBe("腹痛");
    expect(r.chipNames).toContain("めまい");
    expect(r.chipNames).not.toContain("耳鳴り");
    expect(r.suggestions).toEqual(["耳鳴り"]);
  });

  it("スキップ日の症状は数えない", () => {
    const r = computeSymptomChips([makeLog(0, { skipped: true, symptoms: [{ name: "頭痛", severity: 3 }] })]);
    expect(r.frequency["頭痛"]).toBeUndefined();
  });
});

describe("簡易記録がF10で「症状なし」の根拠にならない", () => {
  const jp = (site: "膝" | "手" | "足" | "肘" | "肩" | "その他", severity: 1 | 2 | 3 | 4 | 5) => ({ site, severity });

  it("ベースラインが簡易記録だけ(関節痛が空)でも、新規部位の誤検知をしない", () => {
    const logs = [
      makeLog(0, { jointPain: [jp("膝", 4)] }),
      makeLog(1, { entryMode: "quick" }),
      makeLog(2, { entryMode: "quick" }),
      makeLog(3, { entryMode: "quick" }),
    ];
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("簡易記録をベースラインに含めない場合と、通常の記録だけで比べた結果が一致する(誤検知の対照)", () => {
    const detailed = [
      makeLog(0, { jointPain: [jp("膝", 4)] }),
      makeLog(4, { jointPain: [jp("膝", 1)] }),
      makeLog(5, { jointPain: [jp("膝", 1)] }),
      makeLog(6, { jointPain: [jp("膝", 1)] }),
    ];
    const withQuick = [...detailed, makeLog(1, { entryMode: "quick" }), makeLog(2, { entryMode: "quick" })];
    expect(checkEmergency(detailed).triggered).toBe(true);
    expect(checkEmergency(withQuick).triggered).toBe(true);
  });

  it("最新が簡易記録でも、直近3日以内の通常記録の急変は見逃さない", () => {
    const logs = [
      makeLog(0, { entryMode: "quick" }),
      makeLog(1, { jointPain: [jp("膝", 5)] }),
      makeLog(2, { jointPain: [jp("膝", 1)] }),
      makeLog(3, { jointPain: [jp("膝", 1)] }),
      makeLog(4, { jointPain: [jp("膝", 1)] }),
    ];
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("簡易記録の倦怠感は、発熱を伴わない倦怠感の遷延(ルートD)に数える", () => {
    const logs = [0, 1, 2, 3].map((d) => makeLog(d, { entryMode: "quick", fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("簡易記録は「記録がある日」に数える(データ不足の判定)", () => {
    const logs = [0, 1, 2, 3].map((d) => makeLog(d, { entryMode: "quick" }));
    expect(checkEmergency(logs).dataQuality.recordedDays).toBe(4);
    expect(checkEmergency(logs).dataQuality.insufficient).toBe(false);
  });
});

describe("簡易記録が相関分析・レポートで「症状なし」として混入しない", () => {
  function painLogs(entryMode: "quick" | "full") {
    return Array.from({ length: 12 }, (_, i) => {
      const lowSleep = i % 2 === 0;
      return makeLog(i, {
        entryMode,
        sleepHours: lowSleep ? 4 : 8,
        conditionScore: lowSleep ? 3 : 8,
        jointPain: lowSleep ? [{ site: "膝" as const, severity: 4 as const }] : [],
        symptoms: lowSleep ? [{ name: "頭痛", severity: 4 as const }] : [],
      });
    });
  }

  it("通常記録なら関節痛の強さの相関が見つかる(対照)", () => {
    const f = computeLagCorrelations(painLogs("full"));
    expect(f.some((x) => x.outcomeLabel === "関節痛の強さ")).toBe(true);
    expect(f.some((x) => x.outcomeLabel === "症状の強さ(合計)")).toBe(true);
  });

  it("簡易記録の関節痛(未入力)は0として扱われず、関節痛・症状の強さの相関には使われない", () => {
    const f = computeLagCorrelations(painLogs("quick"));
    expect(f.some((x) => x.outcomeLabel === "関節痛の強さ")).toBe(false);
    expect(f.some((x) => x.outcomeLabel === "症状の強さ(合計)")).toBe(false);
    expect(f.some((x) => x.outcomeLabel === "体調スコア")).toBe(true);
  });

  it("睡眠と翌日の関連: 翌日が簡易記録で症状も倦怠感も無い日は、比較の材料にしない", () => {
    const logs = [
      makeLog(2, { sleepHours: 4 }),
      makeLog(1, { entryMode: "quick" }),
      makeLog(4, { sleepHours: 4 }),
      makeLog(3, { entryMode: "quick", fatigueUnusual: true }),
    ];
    const c = buildReport(logs).sleepCorrelation;
    expect(c.lowSleepDays).toBe(1);
    expect(c.lowSleepFollowedByIssuePercent).toBe(100);
  });
});

describe("入力方式(entryMode)の移行", () => {
  function store(entryMode: unknown) {
    return { version: 1, dailyLogs: [{ id: "a", targetDate: "2026-09-01", skipped: false, jointPain: [], entryMode }] };
  }
  it("\"quick\"と\"full\"は保持し、未設定・不正な値は未設定(通常入力扱い)になる", () => {
    expect(migrateToLatest(store("quick")).dailyLogs[0].entryMode).toBe("quick");
    expect(migrateToLatest(store("full")).dailyLogs[0].entryMode).toBe("full");
    expect(migrateToLatest(store(undefined)).dailyLogs[0].entryMode).toBeUndefined();
    expect(migrateToLatest(store("???")).dailyLogs[0].entryMode).toBeUndefined();
  });
});
