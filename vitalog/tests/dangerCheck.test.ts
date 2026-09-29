import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDanger } from "@/lib/dangerCheck";
import { checkEmergency } from "@/lib/emergencyCheck";
import type { DailyLog } from "@/types/vitalog";

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Danger層(危険症状の独立検知)", () => {
  it("記録が無ければ発火しない", () => {
    expect(checkDanger([])).toEqual({ triggered: false, entries: [] });
  });

  it("危険症状が未選択(既定)なら発火しない", () => {
    expect(checkDanger([makeLog(0, { dangerSymptoms: [] })]).triggered).toBe(false);
    expect(checkDanger([makeLog(0)]).triggered).toBe(false);
  });

  it("今日の記録に1つでも危険症状があれば即座に発火する", () => {
    const r = checkDanger([makeLog(0, { dangerSymptoms: ["息苦しさ・呼吸困難"] })]);
    expect(r.triggered).toBe(true);
    expect(r.entries).toEqual([{ date: TODAY, symptoms: ["息苦しさ・呼吸困難"] }]);
  });

  it("昨日の記録も対象(前夜に記録した症状が翌朝まだ気付かれていない場合を拾う)", () => {
    expect(checkDanger([makeLog(1, { dangerSymptoms: ["胸痛・胸部圧迫感"] })]).triggered).toBe(true);
  });

  it("2日以上前の記録は対象外(後入力・過去データが「今」の警告にならない)", () => {
    expect(checkDanger([makeLog(2, { dangerSymptoms: ["失神・意識がおかしい"] })]).triggered).toBe(false);
  });

  it("未来日付の記録は対象外", () => {
    expect(checkDanger([makeLog(-1, { dangerSymptoms: ["強い動悸"] })]).triggered).toBe(false);
  });

  it("スキップされた記録は対象外", () => {
    expect(checkDanger([makeLog(0, { skipped: true, dangerSymptoms: ["強い動悸"] })]).triggered).toBe(false);
  });

  it("複数の症状・複数日は新しい日付順にまとめて返す", () => {
    const r = checkDanger([
      makeLog(1, { dangerSymptoms: ["強い腹痛"] }),
      makeLog(0, { dangerSymptoms: ["強い動悸", "急激なむくみ"] }),
    ]);
    expect(r.entries.map((e) => e.date)).toEqual([TODAY, dateAgo(1)]);
    expect(r.entries[0].symptoms).toEqual(["強い動悸", "急激なむくみ"]);
  });

  it("F10(ルートA〜D)が発火していなくてもDanger層は独立して発火する", () => {
    const logs = [makeLog(0, { dangerSymptoms: ["異常な出血・黒色便"], temperature: 36.5 })];
    expect(checkEmergency(logs).triggered).toBe(false);
    expect(checkDanger(logs).triggered).toBe(true);
  });

  it("Danger層が発火していなくてもF10は独立して発火する", () => {
    const logs = [makeLog(0, { labs: { ferritinNgMl: 900 } })];
    expect(checkDanger(logs).triggered).toBe(false);
    expect(checkEmergency(logs).triggered).toBe(true);
  });
});
