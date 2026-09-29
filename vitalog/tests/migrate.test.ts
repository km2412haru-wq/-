import { describe, expect, it } from "vitest";
import { migrateToLatest } from "@/lib/migrate";
import { SCHEMA_VERSION } from "@/types/vitalog";

function storeWithMedications(medications: unknown[]) {
  return {
    version: SCHEMA_VERSION,
    dailyLogs: [
      {
        id: "l1",
        targetDate: "2026-09-01",
        recordedAt: "2026-09-01T09:00:00Z",
        skipped: false,
        jointPain: [],
        medications,
        topicalMedications: [],
      },
    ],
  };
}

describe("服薬記録の2値→3値への移行", () => {
  it("旧データで明示的に外されていた(taken: false)ものは「未服用」になる", () => {
    const s = migrateToLatest(
      storeWithMedications([{ id: "m", name: "A", type: "regular", registeredMedicationId: "r", taken: false }])
    );
    expect(s.dailyLogs[0].medications[0].intake).toBe("notTaken");
  });

  it("旧データでチェック済み(taken: true)のものは「服用」になる", () => {
    const s = migrateToLatest(
      storeWithMedications([{ id: "m", name: "A", type: "regular", registeredMedicationId: "r", taken: true }])
    );
    expect(s.dailyLogs[0].medications[0].intake).toBe("taken");
  });

  it("takenが無い旧データ(旧・手動記録の定期薬や頓服)は、記録がある=「服用」として扱う", () => {
    const s = migrateToLatest(
      storeWithMedications([
        { id: "m1", name: "A", type: "regular" },
        { id: "m2", name: "B", type: "asNeeded" },
      ])
    );
    expect(s.dailyLogs[0].medications.map((m) => m.intake)).toEqual(["taken", "taken"]);
  });

  it("既にintakeがあるデータはそのまま保つ(未確認が服用に化けない)", () => {
    const s = migrateToLatest(
      storeWithMedications([
        { id: "m1", name: "A", type: "regular", intake: "unconfirmed" },
        { id: "m2", name: "B", type: "regular", intake: "notTaken" },
        { id: "m3", name: "C", type: "regular", intake: "taken" },
      ])
    );
    expect(s.dailyLogs[0].medications.map((m) => m.intake)).toEqual([
      "unconfirmed",
      "notTaken",
      "taken",
    ]);
  });

  it("intakeが不正な値の場合は旧データ扱いでtakenから合成する", () => {
    const s = migrateToLatest(
      storeWithMedications([{ id: "m", name: "A", type: "regular", intake: "???", taken: false }])
    );
    expect(s.dailyLogs[0].medications[0].intake).toBe("notTaken");
  });

  it("移行を2回通しても結果が変わらない(冪等)", () => {
    const once = migrateToLatest(
      storeWithMedications([{ id: "m", name: "A", type: "regular", taken: false }])
    );
    const twice = migrateToLatest(JSON.parse(JSON.stringify(once)));
    expect(twice.dailyLogs[0].medications).toEqual(once.dailyLogs[0].medications);
  });
});

describe("危険症状フィールドの移行", () => {
  it("旧データ(dangerSymptomsなし)は空配列になる", () => {
    const s = migrateToLatest(storeWithMedications([]));
    expect(s.dailyLogs[0].dangerSymptoms).toEqual([]);
  });

  it("保存されている危険症状はそのまま保つ", () => {
    const raw = storeWithMedications([]);
    (raw.dailyLogs[0] as Record<string, unknown>).dangerSymptoms = ["強い動悸"];
    expect(migrateToLatest(raw).dailyLogs[0].dangerSymptoms).toEqual(["強い動悸"]);
  });
});
