import { afterEach, describe, expect, it, vi } from "vitest";
import { addDaysIso, daysBetweenIso, localTodayIso } from "@/lib/dateUtil";
import { computeLagCorrelations } from "@/lib/correlationAnalysis";
import { buildReport } from "@/lib/report";
import { filterByRange } from "@/lib/trendData";
import type { DailyLog } from "@/types/vitalog";

/**
 * 日付の扱いは端末のタイムゾーンで結果が変わりやすい(コンテナはUTCのため、これまで検出できなかった)。
 * `npm run test:tz` で TZ=Asia/Tokyo / UTC / America/Los_Angeles の3つで全テストを実行する。
 */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

afterEach(() => vi.useRealTimers());

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

describe("日付文字列の計算はタイムゾーンに依存しない", () => {
  it("addDaysIso: 前後の日・月またぎ・うるう日", () => {
    expect(addDaysIso("2026-09-29", 1)).toBe("2026-09-30");
    expect(addDaysIso("2026-09-29", 0)).toBe("2026-09-29");
    expect(addDaysIso("2026-09-29", -1)).toBe("2026-09-28");
    expect(addDaysIso("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("daysBetweenIso: 差(b - a)", () => {
    expect(daysBetweenIso("2026-09-29", "2026-09-30")).toBe(1);
    expect(daysBetweenIso("2026-09-30", "2026-09-29")).toBe(-1);
    expect(daysBetweenIso("2026-03-01", "2026-03-29")).toBe(28);
  });

  it("睡眠不足の翌日に症状ありの割合が、タイムゾーンによらず正しい(JSTで逆転していた不具合の回帰)", () => {
    const report = buildReport([
      makeLog("2026-09-01", { sleepHours: 4 }),
      makeLog("2026-09-02", { fatigueUnusual: true }), // 睡眠不足の翌日: 症状あり
      makeLog("2026-09-03", { sleepHours: 8 }),
      makeLog("2026-09-04", {}), // 十分な睡眠の翌日: 症状なし
    ]);
    const c = report.sleepCorrelation!;
    expect(c.lowSleepFollowedByIssuePercent).toBe(100);
    expect(c.normalSleepFollowedByIssuePercent).toBe(0);
  });

  it("相関分析のラグ1日が、翌日の値と対応する", () => {
    const logs: DailyLog[] = [];
    for (let i = 1; i <= 12; i++) {
      const date = addDaysIso("2026-09-01", i - 1);
      // 睡眠が短い日の翌日に症状が強い(ラグ1日の強い関係)。当日(ラグ0)には関係を作らない
      logs.push(
        makeLog(date, {
          sleepHours: i % 2 === 0 ? 4 : 8,
          symptoms: [{ name: "だるさ", severity: i % 2 === 1 ? 4 : 1 }],
        })
      );
    }
    const found = computeLagCorrelations(logs).filter(
      (f) => f.predictorLabel === "睡眠時間" && f.outcomeLabel === "症状の強さ(合計)"
    );
    const lag1 = found.find((f) => f.lagDays === 1);
    expect(lag1).toBeDefined();
    expect(lag1!.r).toBeLessThan(-0.9); // 睡眠が短い(小)ほど翌日の症状が強い(大)
  });
});

describe("「今日」は端末のローカル日付", () => {
  it("localTodayIso: Intlのローカル日付と一致する(任意の時刻で)", () => {
    for (const iso of ["2026-09-29T00:30:00Z", "2026-09-29T15:30:00Z", "2026-09-29T23:59:00Z", "2026-09-30T00:01:00Z"]) {
      const d = new Date(iso);
      const expected = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
      expect(localTodayIso(d)).toBe(expected);
    }
  });

  it.skipIf(tz !== "Asia/Tokyo")("日本時間の0:30・8:59・9:01・23:59が、全てその日の日付になる(従来は0:00〜8:59が前日)", () => {
    expect(localTodayIso(new Date("2026-09-29T15:30:00Z"))).toBe("2026-09-30"); // JST 00:30
    expect(localTodayIso(new Date("2026-09-29T23:59:00Z"))).toBe("2026-09-30"); // JST 08:59
    expect(localTodayIso(new Date("2026-09-30T00:01:00Z"))).toBe("2026-09-30"); // JST 09:01
    expect(localTodayIso(new Date("2026-09-30T14:59:00Z"))).toBe("2026-09-30"); // JST 23:59
  });

  it.skipIf(tz !== "America/Los_Angeles")("米国西海岸でも、現地の日付になる", () => {
    expect(localTodayIso(new Date("2026-09-30T05:00:00Z"))).toBe("2026-09-29"); // PDT 22:00
  });

  it("トレンドの期間フィルタ(7日)の境界が、ローカルの今日を基準にする", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T20:00:00Z")); // 各TZで2026-09-29または-30
    const today = localTodayIso();
    const logs = [makeLog(today), makeLog(addDaysIso(today, -7)), makeLog(addDaysIso(today, -8))];
    expect(filterByRange(logs, "7d").map((l) => l.targetDate)).toEqual([today, addDaysIso(today, -7)]);
  });
});

describe("F10: 発熱・倦怠感の日数は日付で数える(同じ日に複数件あっても1日)", () => {
  it("同じ日に2件の発熱記録があっても、2日とは数えない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 29, 12, 0, 0));
    const { checkEmergency } = await import("@/lib/emergencyCheck");
    const logs = [
      makeLog("2026-09-29", { temperature: 38.5, fatigueUnusual: true, id: "a" }),
      makeLog("2026-09-29", { temperature: 38.6, fatigueUnusual: true, id: "b" }),
    ];
    // 1日分しかないので、持続発熱(通常3日)にも持続倦怠感にも当たらない
    expect(checkEmergency(logs, [], { today: "2026-09-29" }).triggered).toBe(false);
  });

  it("同じ日に複数件ずつ記録があっても、件数ではなく日数で持続発熱・持続倦怠感を判定する", async () => {
    const { checkEmergency } = await import("@/lib/emergencyCheck");
    const hot = (id: string, d: string) => makeLog(d, { id, temperature: 38.5, fatigueUnusual: true });
    // 2日 × 2件 = 4件だが、2日分(通常の持続発熱は3日以上)
    const logs = [hot("a", "2026-09-28"), hot("b", "2026-09-28"), hot("c", "2026-09-29"), hot("d", "2026-09-29")];
    expect(checkEmergency(logs, [], { today: "2026-09-29" }).triggered).toBe(false);
  });

  it("基準日を引数で指定でき、その日より後の記録は観察窓に入らない", async () => {
    const { checkEmergency } = await import("@/lib/emergencyCheck");
    const hot = (d: string) => makeLog(d, { temperature: 38.5, fatigueUnusual: true });
    const logs = [hot("2026-09-01"), hot("2026-09-02"), hot("2026-09-03")];
    expect(checkEmergency(logs, [], { today: "2026-09-03" }).triggered).toBe(true);
    expect(checkEmergency(logs, [], { today: "2026-09-02" }).triggered).toBe(false); // まだ2日分
  });
});

describe("Danger層とライフステージ判定の「今日」", () => {
  it("checkDangerは基準日を引数で指定でき、前日までの危険症状だけを見る", async () => {
    const { checkDanger } = await import("@/lib/dangerCheck");
    const logs = [makeLog("2026-09-01", { dangerSymptoms: ["息苦しさ"] })];
    expect(checkDanger(logs, { today: "2026-09-01" }).triggered).toBe(true);
    expect(checkDanger(logs, { today: "2026-09-02" }).triggered).toBe(true); // 前日まで
    expect(checkDanger(logs, { today: "2026-09-10" }).triggered).toBe(false);
  });

  it.skipIf(tz !== "Asia/Tokyo")("ライフステージの要注意期間(既定: 2027-04-01の90日前=2027-01-01から)の初日、日本時間の0:30でも期間内になる", async () => {
    const { isInLifeStageTransitionWindow } = await import("@/lib/lifeStage");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T15:30:00Z")); // JST 2027-01-01 00:30(UTCでは2026-12-31で期間の1日前)
    expect(isInLifeStageTransitionWindow()).toBe(true);
  });
});
