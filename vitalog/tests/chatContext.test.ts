import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

const transitionMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/lib/lifeStage", () => ({ isInLifeStageTransitionWindow: transitionMock }));

import { SUMMARY_WINDOW_DAYS, buildChatSummary } from "@/lib/chatContext";
import { KNOWN_LIMITATIONS } from "@/lib/chatLimitations";

const TODAY = "2026-09-29";

function ago(n: number, base = TODAY): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeLog(daysAgo: number, o: Partial<DailyLog> = {}): DailyLog {
  const targetDate = ago(daysAgo);
  return {
    id: `l${daysAgo}-${Math.random()}`,
    targetDate,
    recordedAt: "",
    skipped: false,
    jointPain: [],
    symptoms: [],
    moodReasonTags: [],
    activityTags: [],
    medications: [],
    topicalMedications: [],
    createdAt: "",
    updatedAt: "",
    ...o,
  };
}

const opts = { today: TODAY };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  transitionMock.mockReturnValue(false);
});
afterEach(() => vi.useRealTimers());

describe("記録の有無の集計(記録がない日を「症状なし」にしない)", () => {
  it("記録が無ければ、全日が「記録なし」で、平均などはnull", () => {
    const s = buildChatSummary([], [], opts);
    expect(s.records).toEqual({ recordedDays: 0, skippedDays: 0, unrecordedDays: SUMMARY_WINDOW_DAYS, quickInputDays: 0 });
    expect(s.conditionScore.avg).toBeNull();
    expect(s.temperature.maxCelsius).toBeNull();
    expect(s.sleep.avgHours).toBeNull();
  });

  it("記録日数・スキップ日数・記録なしの日数を区別する", () => {
    const s = buildChatSummary(
      [makeLog(0), makeLog(1), makeLog(2, { skipped: true }), makeLog(3, { skipped: true }), makeLog(3)],
      [],
      opts
    );
    expect(s.records.recordedDays).toBe(3); // 0,1,3日前(3日前はスキップと通常が両方あるが記録あり)
    expect(s.records.skippedDays).toBe(1); // 2日前のみ(3日前は記録があるので除く)
    expect(s.records.unrecordedDays).toBe(SUMMARY_WINDOW_DAYS - 3);
  });

  it("体温を測っていない記録日数を別に数える(発熱なし ≠ 測っていない)", () => {
    const s = buildChatSummary(
      [makeLog(0, { temperature: 36.5 }), makeLog(1), makeLog(2, { temperature: "unmeasured" }), makeLog(3, { temperature: 38.4 })],
      [],
      opts
    );
    expect(s.temperature.measuredDays).toBe(2);
    expect(s.temperature.notMeasuredRecordedDays).toBe(2);
    expect(s.temperature.daysAtOrAbove38).toBe(1);
    expect(s.temperature.maxCelsius).toBe(38.4);
  });

  it("簡易入力の日数を数える", () => {
    const s = buildChatSummary([makeLog(0, { entryMode: "quick" }), makeLog(1)], [], opts);
    expect(s.records.quickInputDays).toBe(1);
  });

  it("30日より前・未来の記録は集計に含めない", () => {
    const s = buildChatSummary([makeLog(SUMMARY_WINDOW_DAYS), makeLog(SUMMARY_WINDOW_DAYS - 1), makeLog(-1)], [], opts);
    expect(s.records.recordedDays).toBe(1);
  });
});

describe("集計値", () => {
  it("体調スコア・気分・睡眠の平均(小数第1位)とn", () => {
    const s = buildChatSummary(
      [makeLog(0, { conditionScore: 4, moodScore: 5, sleepHours: 6 }), makeLog(1, { conditionScore: 7, moodScore: 8, sleepHours: 7 }), makeLog(2)],
      [],
      opts
    );
    expect(s.conditionScore).toEqual({ n: 2, avg: 5.5, min: 4, max: 7 });
    expect(s.moodScore).toEqual({ n: 2, avg: 6.5 });
    expect(s.sleep).toEqual({ recordedDays: 2, avgHours: 6.5 });
  });

  it("関節痛は部位別の日数と平均の強さ、症状は日数の多い順", () => {
    const s = buildChatSummary(
      [
        makeLog(0, { jointPain: [{ site: "膝", severity: 4 }], symptoms: [{ name: "頭痛", severity: 2 }] }),
        makeLog(1, { jointPain: [{ site: "膝", severity: 2 }, { site: "手", severity: 3 }], symptoms: [{ name: "頭痛", severity: 2 }, { name: "咽頭痛", severity: 3 }] }),
      ],
      [],
      opts
    );
    expect(s.jointPain.daysWithPain).toBe(2);
    expect(s.jointPain.bySiteDays).toEqual({ 膝: 2, 手: 1 });
    expect(s.jointPain.avgSeverity).toBe(3);
    expect(s.symptoms).toEqual([{ name: "頭痛", days: 2 }, { name: "咽頭痛", days: 1 }]);
  });

  it("倦怠感・危険症状の記録", () => {
    const s = buildChatSummary(
      [makeLog(0, { fatigueUnusual: true, dangerSymptoms: ["強い動悸"] }), makeLog(1, { fatigueUnusual: true })],
      [],
      opts
    );
    expect(s.fatigueUnusualDays).toBe(2);
    expect(s.dangerSymptomRecords).toEqual([{ date: TODAY, symptoms: ["強い動悸"] }]);
  });

  it("定期薬の服用状況は服用/未服用/未確認を別々に数え、頓服は含めない", () => {
    const med = (name: string, intake: "taken" | "notTaken" | "unconfirmed", type: "regular" | "asNeeded" = "regular") => ({ id: name + intake, name, type, intake });
    const s = buildChatSummary(
      [
        makeLog(0, { medications: [med("A", "taken"), med("頓服", "taken", "asNeeded")] }),
        makeLog(1, { medications: [med("A", "unconfirmed")] }),
        makeLog(2, { medications: [med("A", "notTaken")] }),
      ],
      [],
      opts
    );
    expect(s.regularMedications).toEqual([{ name: "A", taken: 1, notTaken: 1, unconfirmed: 1 }]);
  });

  it("検査値は項目ごとに直近90日の最新値と日付を返し、91日前は含めない", () => {
    const s = buildChatSummary(
      [
        makeLog(5, { labs: { ferritinNgMl: 300 } }),
        makeLog(10, { labs: { ferritinNgMl: 900, esrMmH: 20 } }),
        makeLog(91, { labs: { crpMgDl: 5 } }),
      ],
      [],
      opts
    );
    expect(s.latestLabs["フェリチン(ng/mL)"]).toEqual({ value: 300, date: ago(5) });
    expect(s.latestLabs["ESR(mm/h)"]).toEqual({ value: 20, date: ago(10) });
    expect(s.latestLabs["CRP(mg/dL)"]).toBeUndefined();
  });
});

describe("アプリの警告の状態(チャットは独自に判定しない)", () => {
  it("警告が無ければ両方false", () => {
    const s = buildChatSummary([makeLog(0)], [], opts);
    expect(s.appState.f10.triggered).toBe(false);
    expect(s.appState.danger.triggered).toBe(false);
  });

  it("F10とDanger層の判定結果と理由が、そのまま入る", () => {
    const s = buildChatSummary([makeLog(0, { labs: { ferritinNgMl: 900 }, dangerSymptoms: ["強い動悸"] })], [], opts);
    expect(s.appState.f10.triggered).toBe(true);
    expect(s.appState.f10.reasonGroups[0].category).toBe("検査値");
    expect(s.appState.danger.triggered).toBe(true);
    expect(s.appState.danger.entries[0].symptoms).toEqual(["強い動悸"]);
  });

  it("F10のデータ不足の状態も渡す", () => {
    const s = buildChatSummary([makeLog(0)], [], opts);
    expect(s.appState.f10.insufficientData).toBe(true);
    expect(s.appState.f10.recordedDaysInLast7).toBe(1);
  });

  it("登録済みの薬(解熱薬)の有無がF10の判定に反映される", () => {
    const pred: RegisteredMedication = { id: "p", name: "プレドニン", type: "regular", active: true, createdAt: "" };
    const logs = [0, 1].map((d) => makeLog(d, { temperature: 37.6, fatigueUnusual: d === 0 }));
    expect(buildChatSummary(logs, [], opts).appState.f10.triggered).toBe(false);
    expect(buildChatSummary(logs, [pred], opts).appState.f10.triggered).toBe(true);
  });
});

describe("送らないもの・含めないもの", () => {
  it("自由メモは既定では含めない", () => {
    const s = buildChatSummary([makeLog(0, { memo: "秘密のメモ" })], [], opts);
    expect(s.recentMemos).toBeUndefined();
    expect(JSON.stringify(s)).not.toContain("秘密のメモ");
  });

  it("許可した場合のみ、直近10件・200文字までのメモを含める", () => {
    const logs = Array.from({ length: 15 }, (_, i) => makeLog(i, { memo: `メモ${i}` + "あ".repeat(300) }));
    const s = buildChatSummary(logs, [], { ...opts, includeMemos: true });
    expect(s.recentMemos).toHaveLength(10);
    expect(s.recentMemos![0].date).toBe(TODAY);
    expect(s.recentMemos![0].text.length).toBe(200);
  });

  it("日数をずらす分析(ラグ相関・睡眠の翌日の比較)は含めない", () => {
    // 制限事項の説明文には「翌日」等の語が含まれる(提供していない旨を伝えるため)ので、それを除いて確認する
    const { knownLimitations, ...rest } = buildChatSummary([makeLog(0), makeLog(1)], [], opts);
    expect(knownLimitations.length).toBeGreaterThan(0);
    expect(JSON.stringify(rest)).not.toMatch(/lag|ラグ|相関|sleepCorrelation|翌日/);
  });

  it("既知の制限事項が入る", () => {
    expect(buildChatSummary([], [], opts).knownLimitations).toEqual(KNOWN_LIMITATIONS);
  });
});

describe("今日の日付(端末のローカル日付)", () => {
  it("todayを省略すると、端末のローカル日付になる(UTCの日付ではない)", () => {
    vi.setSystemTime(new Date(2026, 8, 30, 0, 30)); // どのタイムゾーンでも、ローカルで9/30 00:30
    const s = buildChatSummary([], []);
    expect(s.today).toBe("2026-09-30");
    expect(s.window.to).toBe("2026-09-30");
    expect(s.window.from).toBe("2026-09-01");
  });
});
