import { describe, expect, it } from "vitest";
import type { DailyLog, SymptomEntry } from "@/types/vitalog";
import {
  EPISODE_GAP_DAYS,
  RUN_GAP_DAYS,
  deriveOnsetEvents,
  groupIntoEpisodes,
  sequenceLabel,
  toSequence,
  type OnsetEvent,
} from "@/lib/symptomSequence";
import { UNSPECIFIED_SYMPTOM_NAME } from "@/lib/symptomStats";
import { addDaysIso, choiceFromOnsetDate, onsetDateFromChoice } from "@/lib/onsetChoice";
import { migrateToLatest } from "@/lib/migrate";

const BASE = "2026-09-01";
const day = (n: number) => addDaysIso(BASE, n);

function makeLog(dayOffset: number, overrides: Partial<DailyLog> = {}): DailyLog {
  const targetDate = day(dayOffset);
  return {
    id: `log-${dayOffset}-${Math.random()}`,
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

const sym = (name: string, onsetDate?: string): SymptomEntry => ({ name, severity: 3, onsetDate });

describe("発症イベントの導出(deriveOnsetEvents)", () => {
  it("記録された症状は、その連続した出現の最初の日を発症日(derived)として1件のイベントにする", () => {
    const ev = deriveOnsetEvents([0, 1, 2].map((d) => makeLog(d, { symptoms: [sym("頭痛")] })));
    expect(ev).toEqual([{ kind: "symptom", name: "頭痛", onsetDate: day(0), source: "derived" }]);
  });

  it("出現の間隔がちょうど3日なら同じ発症、4日空いたら別の発症(再発)にする", () => {
    expect(RUN_GAP_DAYS).toBe(3);
    const same = deriveOnsetEvents([0, 3].map((d) => makeLog(d, { symptoms: [sym("頭痛")] })));
    expect(same).toHaveLength(1);
    const separate = deriveOnsetEvents([0, 4].map((d) => makeLog(d, { symptoms: [sym("頭痛")] })));
    expect(separate.map((e) => e.onsetDate)).toEqual([day(0), day(4)]);
  });

  it("記録が無い日が挟まっても、出現の間隔が短ければ同じ発症のまま(欠測日で途切れさせない)", () => {
    const ev = deriveOnsetEvents([0, 2].map((d) => makeLog(d, { symptoms: [sym("頭痛")] })));
    expect(ev).toHaveLength(1);
  });

  it("申告された発症日(onsetDate)があれば、それを採用して source を declared にする", () => {
    const ev = deriveOnsetEvents([makeLog(3, { symptoms: [sym("咽頭痛", day(0))] })]);
    expect(ev).toEqual([{ kind: "symptom", name: "咽頭痛", onsetDate: day(0), source: "declared" }]);
  });

  it("申告された発症日が記録日より後(矛盾)なら採用しない", () => {
    const ev = deriveOnsetEvents([makeLog(3, { symptoms: [sym("咽頭痛", day(5))] })]);
    expect(ev[0]).toMatchObject({ onsetDate: day(3), source: "derived" });
  });

  it("申告された発症日が60日より前(誤入力の可能性)なら採用しない、60日ちょうどは採用する", () => {
    const tooOld = deriveOnsetEvents([makeLog(100, { symptoms: [sym("頭痛", day(100 - 61))] })]);
    expect(tooOld[0].source).toBe("derived");
    const ok = deriveOnsetEvents([makeLog(100, { symptoms: [sym("頭痛", day(100 - 60))] })]);
    expect(ok[0]).toMatchObject({ onsetDate: day(40), source: "declared" });
  });

  it("かたまりの最初の記録の申告だけを見る(2日目以降に同じ申告があっても発症は1件)", () => {
    const ev = deriveOnsetEvents([
      makeLog(2, { symptoms: [sym("頭痛", day(0))] }),
      makeLog(3, { symptoms: [sym("頭痛", day(0))] }),
    ]);
    expect(ev).toEqual([{ kind: "symptom", name: "頭痛", onsetDate: day(0), source: "declared" }]);
  });

  it("発熱は38.0℃以上(ちょうども含む)だけを数える。37.9℃・未測定は数えない", () => {
    expect(deriveOnsetEvents([makeLog(0, { temperature: 38.0 })]).map((e) => e.kind)).toEqual(["fever"]);
    expect(deriveOnsetEvents([makeLog(0, { temperature: 37.9 })])).toEqual([]);
    expect(deriveOnsetEvents([makeLog(0, { temperature: "unmeasured" })])).toEqual([]);
  });

  it("倦怠感・関節痛・皮疹(メモまたは写真)も発症イベントになる", () => {
    const ev = deriveOnsetEvents([
      makeLog(0, {
        fatigueUnusual: true,
        jointPain: [{ site: "膝", severity: 2 }],
        rash: { sourcePhotoId: "p1" },
      }),
    ]);
    expect(ev.map((e) => e.kind).sort()).toEqual(["fatigue", "jointPain", "rash"]);
    expect(deriveOnsetEvents([makeLog(0, { rash: { note: "紅斑" } })]).map((e) => e.kind)).toEqual(["rash"]);
  });

  it("スキップ日・「詳細未入力」の症状は数えない", () => {
    expect(deriveOnsetEvents([makeLog(0, { skipped: true, fatigueUnusual: true })])).toEqual([]);
    expect(deriveOnsetEvents([makeLog(0, { symptoms: [sym(UNSPECIFIED_SYMPTOM_NAME)] })])).toEqual([]);
  });

  it("簡易入力の記録でも、聞いている項目(倦怠感・症状)は発症イベントになる", () => {
    const ev = deriveOnsetEvents([makeLog(0, { entryMode: "quick", fatigueUnusual: true, symptoms: [sym("頭痛")] })]);
    expect(ev.map((e) => e.name).sort()).toEqual(["倦怠感", "頭痛"]);
  });

  it("結果は発症日の昇順で、入力の並び順に依存しない", () => {
    const logs = [makeLog(5, { fatigueUnusual: true }), makeLog(0, { symptoms: [sym("咽頭痛")] })];
    expect(deriveOnsetEvents(logs).map((e) => e.name)).toEqual(["咽頭痛", "倦怠感"]);
    expect(deriveOnsetEvents([...logs].reverse()).map((e) => e.name)).toEqual(["咽頭痛", "倦怠感"]);
  });
});

describe("再燃エピソードへのまとめ(groupIntoEpisodes)", () => {
  const ev = (name: string, d: number): OnsetEvent => ({ kind: "symptom", name, onsetDate: day(d), source: "derived" });

  it("発症日の間隔が7日以内なら同じエピソード、8日以上空くと別のエピソード", () => {
    expect(EPISODE_GAP_DAYS).toBe(7);
    expect(groupIntoEpisodes([ev("A", 0), ev("B", 7)])).toHaveLength(1);
    expect(groupIntoEpisodes([ev("A", 0), ev("B", 8)])).toHaveLength(2);
  });

  it("前のイベントから連鎖してつながる(先頭から7日を超えても、直前から7日以内なら同じエピソード)", () => {
    expect(groupIntoEpisodes([ev("A", 0), ev("B", 6), ev("C", 12)])).toHaveLength(1);
  });

  it("入力が昇順でなくても正しくまとめ、イベントが無ければ空", () => {
    const groups = groupIntoEpisodes([ev("C", 20), ev("A", 0), ev("B", 1)]);
    expect(groups.map((g) => g.map((e) => e.name))).toEqual([["A", "B"], ["C"]]);
    expect(groupIntoEpisodes([])).toEqual([]);
  });
});

describe("順列(toSequence / sequenceLabel)", () => {
  it("同じ日に始まったものは同じ段にまとめ、日付順に並べる", () => {
    const steps = toSequence([
      { kind: "fever", name: "発熱", onsetDate: day(2), source: "derived" },
      { kind: "symptom", name: "咽頭痛", onsetDate: day(0), source: "derived" },
      { kind: "fatigue", name: "倦怠感", onsetDate: day(2), source: "derived" },
    ]);
    expect(steps).toEqual([
      { date: day(0), names: ["咽頭痛"] },
      { date: day(2), names: ["倦怠感", "発熱"].sort() },
    ]);
    expect(sequenceLabel(steps)).toBe(`咽頭痛 → ${["倦怠感", "発熱"].sort().join("・")}`);
  });

  it("同じ日に同じ名前のイベントが重複していても、順列には1回だけ出す", () => {
    const dup: OnsetEvent = { kind: "symptom", name: "頭痛", onsetDate: day(0), source: "derived" };
    expect(toSequence([dup, { ...dup, source: "declared" }])).toEqual([{ date: day(0), names: ["頭痛"] }]);
  });

  it("依頼の例(喉の痛み→倦怠感→関節痛→発熱)を、日次記録から順列として導ける", () => {
    const logs = [
      makeLog(0, { symptoms: [sym("喉の痛み")] }),
      makeLog(1, { symptoms: [sym("喉の痛み")], fatigueUnusual: true }),
      makeLog(2, { symptoms: [sym("喉の痛み")], fatigueUnusual: true, jointPain: [{ site: "膝", severity: 3 }] }),
      makeLog(3, { fatigueUnusual: true, jointPain: [{ site: "膝", severity: 3 }], temperature: 38.4 }),
    ];
    const episodes = groupIntoEpisodes(deriveOnsetEvents(logs));
    expect(episodes).toHaveLength(1);
    expect(sequenceLabel(toSequence(episodes[0]))).toBe("喉の痛み → 倦怠感 → 関節痛 → 発熱");
  });

  it("「いつから」の申告で、記録開始より前に始まっていた症状が順列の先頭になる", () => {
    const logs = [
      makeLog(2, { fatigueUnusual: true, symptoms: [sym("咽頭痛", day(0))] }),
    ];
    expect(sequenceLabel(toSequence(deriveOnsetEvents(logs)))).toBe("咽頭痛 → 倦怠感");
  });
});

describe("「いつから」の選択肢と発症日の変換(onsetChoice)", () => {
  it("「この日から」は保存しない、1日前・2日前は対象日からの相対で日付にする", () => {
    expect(onsetDateFromChoice("2026-09-10", "same", "")).toBeUndefined();
    expect(onsetDateFromChoice("2026-09-10", "1", "")).toBe("2026-09-09");
    expect(onsetDateFromChoice("2026-09-10", "2", "")).toBe("2026-09-08");
    expect(onsetDateFromChoice("2026-03-01", "1", "")).toBe("2026-02-28");
  });

  it("日付指定は、記録日より前の正しい日付だけを採用する", () => {
    expect(onsetDateFromChoice("2026-09-10", "custom", "2026-09-01")).toBe("2026-09-01");
    expect(onsetDateFromChoice("2026-09-10", "custom", "2026-09-10")).toBeUndefined();
    expect(onsetDateFromChoice("2026-09-10", "custom", "2026-09-11")).toBeUndefined();
    expect(onsetDateFromChoice("2026-09-10", "custom", "")).toBeUndefined();
    expect(onsetDateFromChoice("2026-09-10", "custom", "2026-13-40")).toBeUndefined();
  });

  it("保存された発症日から選択肢に戻せる(往復)", () => {
    for (const choice of ["same", "1", "2"] as const) {
      const saved = onsetDateFromChoice("2026-09-10", choice, "");
      expect(choiceFromOnsetDate("2026-09-10", saved).choice).toBe(choice);
    }
    expect(choiceFromOnsetDate("2026-09-10", "2026-09-01")).toEqual({ choice: "custom", customDate: "2026-09-01" });
  });

  it("未設定・記録日以降・不正な発症日は「この日から」に戻す", () => {
    expect(choiceFromOnsetDate("2026-09-10", undefined).choice).toBe("same");
    expect(choiceFromOnsetDate("2026-09-10", "2026-09-10").choice).toBe("same");
    expect(choiceFromOnsetDate("2026-09-10", "2026-09-20").choice).toBe("same");
    expect(choiceFromOnsetDate("2026-09-10", "bad").choice).toBe("same");
  });
});

describe("発症日の保存(移行を通しても消えない)", () => {
  it("症状のonsetDateは、読み込み時のmigrateを通しても保持される", () => {
    const raw = {
      version: 1,
      dailyLogs: [
        {
          id: "a",
          targetDate: "2026-09-10",
          skipped: false,
          jointPain: [],
          symptoms: [{ name: "咽頭痛", severity: 3, onsetDate: "2026-09-08" }],
        },
      ],
    };
    expect(migrateToLatest(raw).dailyLogs[0].symptoms[0].onsetDate).toBe("2026-09-08");
  });
});
