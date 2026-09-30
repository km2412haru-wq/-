import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { DailyLog } from "@/types/vitalog";

const transitionMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/lib/lifeStage", () => ({ isInLifeStageTransitionWindow: transitionMock }));

import FerritinEsrRatioNote from "@/components/FerritinEsrRatioNote";
import {
  FERRITIN_ESR_EXCEED_NOTICE,
  FERRITIN_ESR_RATIO_REFERENCE,
  computeFerritinEsrRatio,
  formatRatio,
} from "@/lib/ferritinEsrRatio";
import { checkEmergency } from "@/lib/emergencyCheck";
import { buildReport } from "@/lib/report";
import { applyBulkLabResult } from "@/lib/bulkImport";
import { loadStore, saveStore } from "@/lib/storage";
import { SCHEMA_VERSION } from "@/types/vitalog";

const TODAY = "2026-09-29";

function makeLog(daysAgo: number, overrides: Partial<DailyLog> = {}): DailyLog {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  const targetDate = d.toISOString().slice(0, 10);
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
  transitionMock.mockReturnValue(false);
  window.localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("フェリチン/ESR比の計算", () => {
  it("フェリチンとESRが両方あれば、フェリチン÷ESRを返す", () => {
    const r = computeFerritinEsrRatio({ ferritinNgMl: 400, esrMmH: 20 });
    expect(r?.ratio).toBe(20);
    expect(r?.exceeds).toBe(false);
  });

  it("参考値21.5ちょうどは「超えた」に含めない(超えた場合のみ)", () => {
    expect(computeFerritinEsrRatio({ ferritinNgMl: 430, esrMmH: 20 })?.ratio).toBe(21.5);
    expect(computeFerritinEsrRatio({ ferritinNgMl: 430, esrMmH: 20 })?.exceeds).toBe(false);
  });

  it("21.5をわずかでも超えると超過になる", () => {
    expect(computeFerritinEsrRatio({ ferritinNgMl: 431, esrMmH: 20 })?.exceeds).toBe(true);
    expect(FERRITIN_ESR_RATIO_REFERENCE).toBe(21.5);
  });

  it("片方でも欠けていれば計算しない", () => {
    expect(computeFerritinEsrRatio({ ferritinNgMl: 400 })).toBeNull();
    expect(computeFerritinEsrRatio({ esrMmH: 20 })).toBeNull();
    expect(computeFerritinEsrRatio({})).toBeNull();
    expect(computeFerritinEsrRatio(undefined)).toBeNull();
  });

  it("ESRが0以下・フェリチンが0以下・非数値では計算しない(0除算を避ける)", () => {
    expect(computeFerritinEsrRatio({ ferritinNgMl: 400, esrMmH: 0 })).toBeNull();
    expect(computeFerritinEsrRatio({ ferritinNgMl: 400, esrMmH: -5 })).toBeNull();
    expect(computeFerritinEsrRatio({ ferritinNgMl: 0, esrMmH: 20 })).toBeNull();
    expect(computeFerritinEsrRatio({ ferritinNgMl: NaN, esrMmH: 20 })).toBeNull();
    expect(computeFerritinEsrRatio({ ferritinNgMl: 400, esrMmH: Infinity })).toBeNull();
  });

  it("表示は小数第2位まで(21.5との差が丸めで見えなくならない)", () => {
    expect(formatRatio(21.52)).toBe("21.52");
    expect(formatRatio(20)).toBe("20.00");
  });
});

describe("参考表示(FerritinEsrRatioNote)", () => {
  it("計算できない場合は何も表示しない", () => {
    expect(renderToStaticMarkup(<FerritinEsrRatioNote labs={{ ferritinNgMl: 400 }} />)).toBe("");
  });

  it("超過していない場合は、比を「参考値」付きで控えめに表示する", () => {
    const html = renderToStaticMarkup(<FerritinEsrRatioNote labs={{ ferritinNgMl: 400, esrMmH: 20 }} />);
    expect(html).toContain("20.00");
    expect(html).toContain("参考値");
    expect(html).not.toContain("超えています");
  });

  it("超過した場合の注意書きに、参考値であることと出典の性質(小児・成人未確認)が含まれる", () => {
    const html = renderToStaticMarkup(<FerritinEsrRatioNote labs={{ ferritinNgMl: 600, esrMmH: 20 }} />);
    expect(html).toContain("30.00");
    expect(html).toContain("参考値");
    expect(html).toContain("小児");
    expect(html).toContain("成人のAOSDでの有効性は確認できていません");
    expect(html).toContain("主治医");
  });

  it("超過時の注意書きの定数にも「参考値」が含まれる", () => {
    expect(FERRITIN_ESR_EXCEED_NOTICE).toContain("参考値");
    expect(FERRITIN_ESR_EXCEED_NOTICE).toContain("確認できていません");
  });

  it("赤いF10バナーのクラスは使わない(未検証の閾値で受診を促さない)", () => {
    const html = renderToStaticMarkup(<FerritinEsrRatioNote labs={{ ferritinNgMl: 600, esrMmH: 20 }} />);
    expect(html).not.toContain("emergency-banner");
    expect(html).not.toContain("danger-banner");
  });
});

describe("F10の判定には使わない", () => {
  it("比が参考値を大きく超えていても、F10は発火しない(フェリチン自体が閾値未満の場合)", () => {
    // フェリチン450(<500)、ESR 2 → 比225。比だけではF10は発火しない
    const r = checkEmergency([makeLog(0, { labs: { ferritinNgMl: 450, esrMmH: 2 } })]);
    expect(r.triggered).toBe(false);
  });

  it("フェリチンが閾値以上で発火する場合も、ESRの有無で理由・複数異常の判定が変わらない", () => {
    const withEsr = checkEmergency([makeLog(0, { labs: { ferritinNgMl: 900, esrMmH: 2 } })]);
    const without = checkEmergency([makeLog(0, { labs: { ferritinNgMl: 900 } })]);
    expect(withEsr.reasons).toEqual(without.reasons);
    expect(withEsr.multipleLabAbnormal).toBe(false);
  });
});

describe("レポートへの反映", () => {
  it("同じ日にフェリチンとESRが揃っている日の比を日付順に返し、超過を示す", () => {
    const r = buildReport([
      makeLog(0, { labs: { ferritinNgMl: 600, esrMmH: 20 } }),
      makeLog(5, { labs: { ferritinNgMl: 200, esrMmH: 20 } }),
      makeLog(3, { labs: { ferritinNgMl: 300 } }),
      makeLog(2, { labs: { esrMmH: 30 } }),
    ]);
    expect(r.ferritinEsrRatios).toHaveLength(2);
    expect(r.ferritinEsrRatios.map((x) => x.exceeds)).toEqual([false, true]);
    expect(r.ferritinEsrRatios[0].date < r.ferritinEsrRatios[1].date).toBe(true);
  });

  it("別の日のフェリチンとESRは組み合わせない", () => {
    const r = buildReport([makeLog(1, { labs: { ferritinNgMl: 600 } }), makeLog(0, { labs: { esrMmH: 20 } })]);
    expect(r.ferritinEsrRatios).toEqual([]);
  });

  it("スキップ日は含めない", () => {
    const r = buildReport([makeLog(0, { skipped: true, labs: { ferritinNgMl: 600, esrMmH: 20 } })]);
    expect(r.ferritinEsrRatios).toEqual([]);
  });
});

describe("検査値の一括インポートで、既存の検査値を消さない", () => {
  function seed(logs: DailyLog[]) {
    saveStore({
      version: SCHEMA_VERSION,
      dailyLogs: logs,
      registeredMedications: [],
      taperingEvents: [],
      hypotheses: [],
      selfExperiments: [],
      visits: [],
    });
  }

  it("読み取れなかった項目(undefined)で、その日の既存の検査値を上書きして消さない", () => {
    const date = makeLog(1).targetDate;
    seed([makeLog(1, { labs: { wbcPerUl: 5000, ferritinNgMl: 100, esrMmH: 15 } })]);
    applyBulkLabResult(date, { ferritinNgMl: 300, wbcPerUl: undefined, esrMmH: undefined });
    const labs = loadStore().dailyLogs.find((l) => l.targetDate === date)?.labs;
    expect(labs).toMatchObject({ wbcPerUl: 5000, ferritinNgMl: 300, esrMmH: 15 });
  });

  it("新しく読み取れた値は既存の値を更新する", () => {
    const date = makeLog(1).targetDate;
    seed([makeLog(1, { labs: { esrMmH: 15 } })]);
    applyBulkLabResult(date, { esrMmH: 40 });
    expect(loadStore().dailyLogs.find((l) => l.targetDate === date)?.labs?.esrMmH).toBe(40);
  });

  it("その日の記録が無ければ、読み取れた項目だけで新規作成する", () => {
    seed([]);
    applyBulkLabResult("2026-09-10", { ferritinNgMl: 300, esrMmH: undefined });
    const labs = loadStore().dailyLogs.find((l) => l.targetDate === "2026-09-10")?.labs;
    expect(labs).toEqual({ ferritinNgMl: 300 });
  });
});
