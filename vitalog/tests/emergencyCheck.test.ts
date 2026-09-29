import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

// ライフステージ移行期間かどうかはテストごとに切り替える(実日付・設定値に依存させない)
const transitionMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/lib/lifeStage", () => ({
  isInLifeStageTransitionWindow: transitionMock,
}));

import { checkEmergency, isOnFeverSuppressingMedication } from "@/lib/emergencyCheck";

/** 「今日」を固定する。checkEmergencyは new Date() のUTC日付を基準にする */
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

function makeMed(name: string, active = true): RegisteredMedication {
  return { id: `med-${name}`, name, type: "regular", active, createdAt: "2026-01-01T00:00:00Z" };
}

/** 0日前から連続してn日分のログを作る。各日のoverridesは関数で指定できる */
function consecutiveLogs(
  count: number,
  perDay: (daysAgo: number) => Partial<DailyLog> = () => ({})
): DailyLog[] {
  return Array.from({ length: count }, (_, i) => makeLog(i, perDay(i)));
}

const PREDNISOLONE = [makeMed("プレドニン錠5mg")];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  transitionMock.mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("記録なし・スキップ", () => {
  it("記録が無ければ発火しない", () => {
    const r = checkEmergency([]);
    expect(r.triggered).toBe(false);
    expect(r.reasons).toEqual([]);
    expect(r.reasonGroups).toEqual([]);
  });

  it("スキップ日は判定に使われない(スキップ日に高熱・倦怠感が入っていても無視)", () => {
    const logs = consecutiveLogs(5, () => ({ skipped: true, temperature: 39, fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });
});

describe("ルートA: 持続発熱 かつ 持続倦怠感(通常時)", () => {
  it("38.0℃ちょうどが3日 + 倦怠感2日で発火する(境界値: 38.0は該当)", () => {
    const logs = consecutiveLogs(3, (i) => ({
      temperature: 38.0,
      fatigueUnusual: i < 2,
    }));
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    expect(r.reasonGroups.map((g) => g.category)).toEqual(["発熱・倦怠感"]);
    expect(r.reasons[0]).toContain("38℃以上の発熱が3日");
  });

  it("37.9℃は発熱に該当せず発火しない", () => {
    const logs = consecutiveLogs(3, (i) => ({ temperature: 37.9, fatigueUnusual: i < 2 }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("発熱該当が2日だけ(必要3日)なら発火しない", () => {
    const logs = consecutiveLogs(3, (i) => ({
      temperature: i < 2 ? 38.5 : 36.5,
      fatigueUnusual: true,
    }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("倦怠感が1日だけ(必要2日)なら発火しない", () => {
    const logs = consecutiveLogs(3, (i) => ({ temperature: 38.5, fatigueUnusual: i === 0 }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("高熱が3日続いても倦怠感が無ければ発火しない(発熱単独では発火しない)", () => {
    const logs = consecutiveLogs(3, () => ({ temperature: 39 }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("体温が未測定(unmeasured)の日は発熱に数えない", () => {
    const logs = consecutiveLogs(3, (i) => ({
      temperature: i === 0 ? "unmeasured" : 38.5,
      fatigueUnusual: true,
    }));
    // 発熱該当は2日のみ → A不成立。倦怠感3日は solo(4日)未満
    expect(checkEmergency(logs).triggered).toBe(false);
  });
});

describe("ルートA: 解熱薬服用中の閾値(37.5℃・敏感化)", () => {
  // 服用中は sensitive: 発熱必要日数 3→2、Aの倦怠感必要日数 2→1
  it("37.5℃ちょうどが2日 + 倦怠感1日で発火する(境界値)", () => {
    const logs = consecutiveLogs(2, (i) => ({ temperature: 37.5, fatigueUnusual: i === 0 }));
    const r = checkEmergency(logs, PREDNISOLONE);
    expect(r.triggered).toBe(true);
    expect(r.reasons[0]).toContain("37.5℃以上");
    expect(r.reasons[0]).toContain("解熱・抗炎症薬の服用中");
  });

  it("同じ記録でも解熱薬を飲んでいなければ発火しない", () => {
    const logs = consecutiveLogs(2, (i) => ({ temperature: 37.5, fatigueUnusual: i === 0 }));
    expect(checkEmergency(logs, []).triggered).toBe(false);
  });

  it("37.4℃は服用中でも発熱に該当せず発火しない", () => {
    const logs = consecutiveLogs(2, (i) => ({ temperature: 37.4, fatigueUnusual: i === 0 }));
    expect(checkEmergency(logs, PREDNISOLONE).triggered).toBe(false);
  });

  it("中止済み(active=false)の解熱薬は服用中とみなさない", () => {
    const logs = consecutiveLogs(2, (i) => ({ temperature: 37.5, fatigueUnusual: i === 0 }));
    expect(checkEmergency(logs, [makeMed("プレドニン錠5mg", false)]).triggered).toBe(false);
  });

  it("発熱が1日だけ(敏感時でも必要2日)なら発火しない", () => {
    const logs = consecutiveLogs(2, (i) => ({
      temperature: i === 0 ? 38.5 : 36.5,
      fatigueUnusual: true,
    }));
    // 倦怠感2日は敏感時のsolo(3日)にも満たない
    expect(checkEmergency(logs, PREDNISOLONE).triggered).toBe(false);
  });
});

describe("isOnFeverSuppressingMedication", () => {
  it("ステロイド・NSAIDs・アセトアミノフェン系の名前に部分一致する", () => {
    for (const name of ["プレドニン錠5mg", "ロキソニン", "カロナール錠200", "セレコキシブ", "NSAID外用"]) {
      expect(isOnFeverSuppressingMedication([makeMed(name)])).toBe(true);
    }
  });

  it("無関係な薬・中止済みの薬は対象外", () => {
    expect(isOnFeverSuppressingMedication([makeMed("ガスター")])).toBe(false);
    expect(isOnFeverSuppressingMedication([makeMed("ロキソニン", false)])).toBe(false);
    expect(isOnFeverSuppressingMedication([])).toBe(false);
  });
});

describe("ルートB: 検査値異常", () => {
  it("フェリチン500ng/mLちょうどで単独発火する(境界値)", () => {
    const r = checkEmergency([makeLog(0, { labs: { ferritinNgMl: 500 } })]);
    expect(r.triggered).toBe(true);
    expect(r.reasonGroups.map((g) => g.category)).toEqual(["検査値"]);
    expect(r.reasons[0]).toContain("フェリチン");
  });

  it("フェリチン499では発火しない", () => {
    expect(checkEmergency([makeLog(0, { labs: { ferritinNgMl: 499 } })]).triggered).toBe(false);
  });

  it("血小板100,000/μLちょうどで単独発火する(境界値)", () => {
    const r = checkEmergency([makeLog(0, { labs: { plateletsPerUl: 100_000 } })]);
    expect(r.triggered).toBe(true);
    expect(r.reasons[0]).toContain("血小板");
  });

  it("血小板100,001では発火しない", () => {
    expect(checkEmergency([makeLog(0, { labs: { plateletsPerUl: 100_001 } })]).triggered).toBe(false);
  });

  it("最新記録に検査値が無くても、14日窓内の過去の値を拾って発火する(フェリチン)", () => {
    const logs = [makeLog(0), makeLog(1), makeLog(5, { labs: { ferritinNgMl: 800 } })];
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("最新記録に検査値が無くても、14日窓内の過去の値を拾って発火する(血小板)", () => {
    const logs = [makeLog(0), makeLog(1), makeLog(9, { labs: { plateletsPerUl: 80_000 } })];
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("14日前ちょうどの検査値は窓内として拾う(境界値)", () => {
    const logs = [makeLog(0), makeLog(14, { labs: { ferritinNgMl: 800 } })];
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("15日前の検査値は窓外なので発火しない", () => {
    const logs = [makeLog(0), makeLog(15, { labs: { ferritinNgMl: 800 } })];
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("窓内に新しい正常値があれば、それより古い異常値ではなく新しい値が使われる", () => {
    const logs = [
      makeLog(1, { labs: { ferritinNgMl: 200 } }),
      makeLog(8, { labs: { ferritinNgMl: 900 } }),
    ];
    expect(checkEmergency(logs).triggered).toBe(false);
  });
});

describe("ルートC: 症状の急変", () => {
  const jp = (site: "膝" | "手" | "足" | "肘" | "肩" | "その他", severity: 1 | 2 | 3 | 4 | 5) => ({
    site,
    severity,
  });

  /** latest(0日前) + 直前3件(1〜3日前)のログを作る */
  function withBaseline(latest: Partial<DailyLog>, baseline: Partial<DailyLog>): DailyLog[] {
    return [makeLog(0, latest), makeLog(1, baseline), makeLog(2, baseline), makeLog(3, baseline)];
  }

  it("直近平均からの乖離(2以上)かつ最大強さ3以上で発火する", () => {
    const logs = withBaseline({ jointPain: [jp("膝", 4)] }, { jointPain: [jp("膝", 1)] });
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    expect(r.reasonGroups.map((g) => g.category)).toEqual(["症状の急変"]);
    expect(r.reasons[0]).toContain("関節痛の強さ");
  });

  it("乖離がちょうど2(境界値)でも発火する", () => {
    const logs = withBaseline({ jointPain: [jp("膝", 3)] }, { jointPain: [jp("膝", 1)] });
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("乖離が2未満(1.9相当)なら発火しない", () => {
    const logs = withBaseline({ jointPain: [jp("膝", 3)] }, { jointPain: [jp("膝", 2)] });
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("もともと強い痛みが続いているだけ(乖離なし)なら発火しない", () => {
    const logs = withBaseline({ jointPain: [jp("膝", 5)] }, { jointPain: [jp("膝", 5)] });
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("新規部位がseverity3で発火する", () => {
    const logs = withBaseline(
      { jointPain: [jp("膝", 2), jp("肘", 3)] },
      { jointPain: [jp("膝", 2)] }
    );
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    expect(r.reasons.join()).toContain("肘");
  });

  it("新規部位がseverity2では発火しない", () => {
    const logs = withBaseline(
      { jointPain: [jp("膝", 2), jp("肘", 2)] },
      { jointPain: [jp("膝", 2)] }
    );
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("新規部位がseverity1では発火しない", () => {
    const logs = withBaseline(
      { jointPain: [jp("膝", 2), jp("肘", 1)] },
      { jointPain: [jp("膝", 2)] }
    );
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("比較用のベースラインが2件未満なら関節痛の急変は判定しない", () => {
    const logs = [makeLog(0, { jointPain: [jp("膝", 5)] }), makeLog(1, { jointPain: [jp("手", 1)] })];
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("解熱薬服用中(敏感化)は乖離1.5から発火する(通常時は発火しない差)", () => {
    // latest 平均3 vs baseline 平均1.5(1と2の混在) → 乖離1.5
    const logs = [
      makeLog(0, { jointPain: [jp("膝", 3)] }),
      makeLog(1, { jointPain: [jp("膝", 1)] }),
      makeLog(2, { jointPain: [jp("膝", 2)] }),
    ];
    expect(checkEmergency(logs, []).triggered).toBe(false);
    expect(checkEmergency(logs, PREDNISOLONE).triggered).toBe(true);
  });

  it("皮疹が新規に記録されると発火する", () => {
    const logs = [makeLog(0, { rash: { note: "腕に紅斑" } }), makeLog(1), makeLog(2)];
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    expect(r.reasons.join()).toContain("皮疹");
  });

  it("皮疹が写真だけ(メモなし)でも新規出現として発火する", () => {
    const logs = [makeLog(0, { rash: { sourcePhotoId: "photo-1" } }), makeLog(1)];
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("直前の記録にも皮疹があれば新規ではないので発火しない", () => {
    const logs = [
      makeLog(0, { rash: { note: "紅斑" } }),
      makeLog(1, { rash: { note: "紅斑" } }),
      makeLog(2),
    ];
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("比較できる過去の記録が無ければ(初回記録)皮疹だけでは発火しない", () => {
    expect(checkEmergency([makeLog(0, { rash: { note: "紅斑" } })]).triggered).toBe(false);
  });
});

describe("ルートD: 発熱を伴わない倦怠感の遷延(通常時: 4日)", () => {
  it("発熱なしで倦怠感が4日連続すると発火する", () => {
    const logs = consecutiveLogs(4, () => ({ temperature: 36.5, fatigueUnusual: true }));
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    expect(r.reasonGroups.map((g) => g.category)).toEqual(["発熱・倦怠感"]);
    expect(r.reasons[0]).toContain("発熱を伴わない");
  });

  it("体温を測っていなくても(unmeasured)倦怠感4日で発火する", () => {
    const logs = consecutiveLogs(4, () => ({ temperature: "unmeasured", fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("倦怠感が3日では発火しない(規定日数未満)", () => {
    const logs = consecutiveLogs(3, () => ({ fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("倦怠感の日が途中で途切れて合計3日なら発火しない", () => {
    const logs = consecutiveLogs(5, (i) => ({ fatigueUnusual: i !== 2 && i !== 4 }));
    // 該当日は i=0,1,3 の3日
    expect(checkEmergency(logs).triggered).toBe(false);
  });
});

describe("ルートD: ライフステージ移行期間(敏感化: 3日)", () => {
  beforeEach(() => {
    transitionMock.mockReturnValue(true);
  });

  it("倦怠感3日で発火する(通常時は4日必要)", () => {
    const logs = consecutiveLogs(3, () => ({ fatigueUnusual: true }));
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    expect(r.reasons[0]).toContain("ライフステージ移行");
  });

  it("倦怠感2日では発火しない", () => {
    const logs = consecutiveLogs(2, () => ({ fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("移行期間中もAルートは敏感化される(発熱2日+倦怠感1日)", () => {
    const logs = consecutiveLogs(2, (i) => ({ temperature: 38.2, fatigueUnusual: i === 0 }));
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("移行期間中は解熱薬が無ければ発熱閾値は38.0のまま", () => {
    const logs = consecutiveLogs(2, (i) => ({ temperature: 37.6, fatigueUnusual: i === 0 }));
    expect(checkEmergency(logs, []).triggered).toBe(false);
  });
});

describe("ルートD: 解熱薬服用中(敏感化: 3日)", () => {
  it("倦怠感3日で発火する(発熱マスキング対応)", () => {
    const logs = consecutiveLogs(3, () => ({ temperature: 36.8, fatigueUnusual: true }));
    const r = checkEmergency(logs, PREDNISOLONE);
    expect(r.triggered).toBe(true);
    expect(r.reasons[0]).toContain("解熱・抗炎症薬");
  });
});

describe("共通: 複数ルート同時・理由表示", () => {
  it("A・B・Cが同時に成立すると3カテゴリすべての理由が表示される", () => {
    const logs = [
      makeLog(0, {
        temperature: 38.5,
        fatigueUnusual: true,
        rash: { note: "紅斑" },
        labs: { ferritinNgMl: 900 },
      }),
      makeLog(1, { temperature: 38.5, fatigueUnusual: true }),
      makeLog(2, { temperature: 38.5, fatigueUnusual: false }),
    ];
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    expect(r.reasonGroups.map((g) => g.category)).toEqual([
      "発熱・倦怠感",
      "検査値",
      "症状の急変",
    ]);
    expect(r.reasons).toHaveLength(3);
    expect(r.reasons).toEqual(r.reasonGroups.flatMap((g) => g.reasons));
  });

  it("フェリチンと血小板が両方異常なら検査値カテゴリに2件の理由が出る", () => {
    const r = checkEmergency([makeLog(0, { labs: { ferritinNgMl: 900, plateletsPerUl: 50_000 } })]);
    const lab = r.reasonGroups.find((g) => g.category === "検査値");
    expect(lab?.reasons).toHaveLength(2);
  });

  it("Aが成立している時、Dの重複メッセージは出さない(発熱・倦怠感カテゴリは1件)", () => {
    const logs = consecutiveLogs(4, () => ({ temperature: 38.5, fatigueUnusual: true }));
    const r = checkEmergency(logs);
    expect(r.triggered).toBe(true);
    const g = r.reasonGroups.find((x) => x.category === "発熱・倦怠感");
    expect(g?.reasons).toHaveLength(1);
    expect(g?.reasons[0]).not.toContain("発熱を伴わない");
  });

  it("発火していない時は理由もグループも空", () => {
    const r = checkEmergency(consecutiveLogs(3, () => ({ temperature: 36.5 })));
    expect(r).toEqual({ triggered: false, reasons: [], reasonGroups: [] });
  });
});

describe("共通: ストリーク判定(連続性・7日固定窓)", () => {
  it("1日空く(日付差2日)とストリークが途切れ、それより古い倦怠感は数えない", () => {
    // 0,1日前に倦怠感、2日前は記録なし、3,4日前に倦怠感 → 直近ストリークは2日分のみ
    const logs = [0, 1, 3, 4].map((d) => makeLog(d, { fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("空白なく連続していれば4日分をまとめて数える", () => {
    const logs = [0, 1, 2, 3].map((d) => makeLog(d, { fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("ストリークは新しい方から最大7日分だけを見る(8日目以降の倦怠感は数えない)", () => {
    // 0〜7日前の8日連続。倦怠感は4〜7日前の4日 → 窓(0〜6日前)内では4,5,6の3日のみ
    const logs = consecutiveLogs(8, (i) => ({ fatigueUnusual: i >= 4 }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });

  it("7日窓の内側(3〜6日前)に倦怠感4日があれば発火する", () => {
    const logs = consecutiveLogs(8, (i) => ({ fatigueUnusual: i >= 3 && i <= 6 }));
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("記録の並び順が入力でバラバラでも日付順に正しく処理される", () => {
    const logs = [3, 0, 2, 1].map((d) => makeLog(d, { fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(true);
  });

  it("14日より古い記録は対象外(判定窓の外)", () => {
    const logs = [15, 16, 17, 18].map((d) => makeLog(d, { fatigueUnusual: true }));
    expect(checkEmergency(logs).triggered).toBe(false);
  });
});
