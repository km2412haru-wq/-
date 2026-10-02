import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyLog } from "@/types/vitalog";

// 要注意期間かどうかはテストごとに固定(実日付に依存させない)
vi.mock("@/lib/lifeStage", () => ({ isInLifeStageTransitionWindow: () => false }));

import { buildChatSummary } from "@/lib/chatContext";
import { computeLagCorrelations } from "@/lib/correlationAnalysis";
import { checkEmergency } from "@/lib/emergencyCheck";
import { isRecordedDay } from "@/lib/logKind";
import { buildReport } from "@/lib/report";
import { filterByRange } from "@/lib/trendData";

const TODAY = "2026-09-29";

function dateAgo(n: number): string {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeLog(daysAgo: number, extra: Partial<DailyLog> = {}): DailyLog {
  const targetDate = dateAgo(daysAgo);
  return {
    id: `log-${daysAgo}-${Math.random()}`,
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

const labsOnlyLog = (daysAgo: number, labs: DailyLog["labs"]) => makeLog(daysAgo, { labsOnly: true, labs });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T03:00:00Z`));
});
afterEach(() => vi.useRealTimers());

describe("isRecordedDay", () => {
  it("通常の記録は記録日、スキップと検査値のみは記録日ではない", () => {
    expect(isRecordedDay(makeLog(0))).toBe(true);
    expect(isRecordedDay(makeLog(0, { skipped: true }))).toBe(false);
    expect(isRecordedDay(makeLog(0, { labsOnly: true }))).toBe(false);
  });
});

describe("検査値のみの記録は、症状なしの記録日として数えない", () => {
  it("F10: 記録日数に入らない(判定精度の不足は解消されない)", () => {
    const logs = [makeLog(0, { conditionScore: 5 }), labsOnlyLog(1, { ferritinNgMl: 10 }), labsOnlyLog(2, {})];
    const quality = checkEmergency(logs).dataQuality;
    expect(quality.recordedDays).toBe(1);
    expect(quality.insufficient).toBe(true);
  });

  it("F10: ただし検査値は、検査値のみの記録からも読む(ルートB)", () => {
    const result = checkEmergency([labsOnlyLog(1, { wbcPerUl: 3000 })]);
    expect(result.triggered).toBe(true);
    expect(result.reasons.join("")).toContain("WBC");
  });

  it("F10: 検査値のみの記録は、発熱・倦怠感の日数にも症状の急変にも影響しない", () => {
    const result = checkEmergency([labsOnlyLog(0, { ferritinNgMl: 100 }), labsOnlyLog(1, {})]);
    expect(result.triggered).toBe(false);
  });

  it("レポート: 記録件数と集計に入らない", () => {
    const report = buildReport([makeLog(0, { conditionScore: 6 }), labsOnlyLog(1, { astUL: 20 })]);
    expect(report.entryCount).toBe(1);
    expect(report.avgConditionScore).toBe(6);
  });

  it("チャット要約: 記録日数に入らないが、最新の検査値には含まれる", () => {
    const summary = buildChatSummary(
      [makeLog(0, { conditionScore: 6 }), labsOnlyLog(1, { ferritinNgMl: 123 })],
      [],
      { today: TODAY }
    );
    expect(summary.records.recordedDays).toBe(1);
    expect(summary.latestLabs["フェリチン(ng/mL)"]).toEqual({ value: 123, date: dateAgo(1) });
  });

  it("相関分析: 検査値のみの日を「症状の強さ0の日」として材料にしない", () => {
    const base: DailyLog[] = [];
    for (let i = 12; i >= 1; i--) {
      base.push(makeLog(i, { sleepHours: 4 + (i % 5), symptoms: [{ name: "だるさ", severity: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5 }] }));
    }
    const without = computeLagCorrelations(base);
    const withLabsOnly = computeLagCorrelations([...base, labsOnlyLog(0, { astUL: 20 })]);
    expect(without.length).toBeGreaterThan(0);
    expect(withLabsOnly.map((f) => f.n)).toEqual(without.map((f) => f.n));
    expect(withLabsOnly.map((f) => f.r)).toEqual(without.map((f) => f.r));
  });

  it("トレンド: 期間フィルタに入らない", () => {
    const logs = [makeLog(0, { conditionScore: 5 }), labsOnlyLog(1, {})];
    expect(filterByRange(logs, "all")).toHaveLength(1);
    expect(filterByRange(logs, "7d")).toHaveLength(1);
  });
});
