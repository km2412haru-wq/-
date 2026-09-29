import { describe, expect, it } from "vitest";
import { buildReport } from "@/lib/report";
import type { DailyLog, MedicationIntake, MedicationRecord } from "@/types/vitalog";

function med(name: string, intake: MedicationIntake | undefined, type: "regular" | "asNeeded" = "regular"): MedicationRecord {
  return { id: `${name}-${intake}`, name, type, intake };
}

function makeLog(date: string, overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id: date,
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
    ...overrides,
  };
}

describe("レポートの服用状況(3状態)", () => {
  it("定期薬ごとに服用/未服用/未確認の日数を別々に集計する(未確認は服用に混ぜない)", () => {
    const r = buildReport([
      makeLog("2026-09-01", { medications: [med("A", "taken"), med("B", "unconfirmed")] }),
      makeLog("2026-09-02", { medications: [med("A", "unconfirmed"), med("B", "unconfirmed")] }),
      makeLog("2026-09-03", { medications: [med("A", "notTaken"), med("B", "taken")] }),
    ]);
    expect(r.medicationAdherence).toEqual([
      { name: "A", taken: 1, notTaken: 1, unconfirmed: 1 },
      { name: "B", taken: 1, notTaken: 0, unconfirmed: 2 },
    ]);
  });

  it("頓服は服用状況の集計に含めない", () => {
    const r = buildReport([makeLog("2026-09-01", { medications: [med("頓服A", "taken", "asNeeded")] })]);
    expect(r.medicationAdherence).toEqual([]);
  });

  it("スキップされた日は集計しない", () => {
    const r = buildReport([makeLog("2026-09-01", { skipped: true, medications: [med("A", "taken")] })]);
    expect(r.medicationAdherence).toEqual([]);
  });
});

describe("レポートの危険症状", () => {
  it("危険症状が記録された日を日付順に返す", () => {
    const r = buildReport([
      makeLog("2026-09-03", { dangerSymptoms: ["強い腹痛"] }),
      makeLog("2026-09-01", { dangerSymptoms: ["強い動悸"] }),
      makeLog("2026-09-02"),
    ]);
    expect(r.dangerSymptomEntries).toEqual([
      { date: "2026-09-01", symptoms: ["強い動悸"] },
      { date: "2026-09-03", symptoms: ["強い腹痛"] },
    ]);
  });
});
