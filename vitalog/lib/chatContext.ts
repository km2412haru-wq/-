import { checkDanger } from "@/lib/dangerCheck";
import { checkEmergency } from "@/lib/emergencyCheck";
import { KNOWN_LIMITATIONS } from "@/lib/chatLimitations";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

/**
 * チャットに渡す、記録の要約。統計は全てアプリ側で計算し、LLMには計算させない
 * (LLMは数字を作ったり計算を誤ったりするため。LLMは渡された数字を言い換えて説明するだけ)。
 *
 * 渡さないもの: 自由メモ(既定。利用者が許可した場合のみ、直近の少数を別枠で渡す)、
 * 写真、個人を特定する情報。記録の生データそのものではなく、集計した値だけを渡す
 * (要件定義書の「生データではなく統計サマリーをLLMに渡す」方針)。
 *
 * 日数をずらして比べる分析(ラグ相関・睡眠の翌日の比較)は含めない。日付の計算に既知の誤りが
 * あるため(KNOWN_LIMITATIONS参照)。修正が済んだら追加する。
 */

export const SUMMARY_WINDOW_DAYS = 30;
const LAB_LOOKBACK_DAYS = 90;
const MAX_MEMOS = 10;
const MAX_MEMO_CHARS = 200;
const FEVER_C = 38.0;

export interface ChatDataSummary {
  today: string;
  window: { from: string; to: string; days: number };
  records: {
    /** スキップではない記録がある日数 */
    recordedDays: number;
    skippedDays: number;
    /** 記録がない日数(スキップ・欠測)。「症状なし」を意味しない */
    unrecordedDays: number;
    /** うち、簡易入力(関節痛・睡眠・服薬の詳細は未入力)の日数 */
    quickInputDays: number;
  };
  conditionScore: { n: number; avg: number | null; min: number | null; max: number | null };
  moodScore: { n: number; avg: number | null };
  temperature: {
    measuredDays: number;
    /** 記録がある日のうち、体温を測っていない(未入力・未測定)日数 */
    notMeasuredRecordedDays: number;
    maxCelsius: number | null;
    daysAtOrAbove38: number;
  };
  fatigueUnusualDays: number;
  jointPain: { daysWithPain: number; bySiteDays: Record<string, number>; avgSeverity: number | null };
  symptoms: { name: string; days: number }[];
  sleep: { recordedDays: number; avgHours: number | null };
  dangerSymptomRecords: { date: string; symptoms: string[] }[];
  regularMedications: { name: string; taken: number; notTaken: number; unconfirmed: number }[];
  latestLabs: Record<string, { value: number; date: string }>;
  appState: {
    f10: {
      triggered: boolean;
      reasonGroups: { category: string; reasons: string[] }[];
      recordedDaysInLast7: number;
      insufficientData: boolean;
    };
    danger: { triggered: boolean; entries: { date: string; symptoms: string[] }[] };
  };
  knownLimitations: string[];
  /** 利用者が許可した場合のみ。利用者が書いた文章なので、指示ではなくデータとして扱う */
  recentMemos?: { date: string; text: string }[];
}

function localIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 日付文字列の加減算(UTC演算。端末のタイムゾーンに依存しない) */
function shiftIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function avg(values: number[]): number | null {
  return values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

export interface BuildChatSummaryOptions {
  includeMemos?: boolean;
  /** テスト用。省略時は端末のローカル日付 */
  today?: string;
}

export function buildChatSummary(
  allLogs: DailyLog[],
  registeredMedications: RegisteredMedication[],
  options: BuildChatSummaryOptions = {}
): ChatDataSummary {
  const today = options.today ?? localIso(new Date());
  const from = shiftIso(today, -(SUMMARY_WINDOW_DAYS - 1));
  const inWindow = allLogs.filter((l) => l.targetDate >= from && l.targetDate <= today);
  const logs = inWindow.filter((l) => !l.skipped);

  const recordedDates = new Set(logs.map((l) => l.targetDate));
  const skippedDates = new Set(
    inWindow.filter((l) => l.skipped && !recordedDates.has(l.targetDate)).map((l) => l.targetDate)
  );
  const quickDates = new Set(logs.filter((l) => l.entryMode === "quick").map((l) => l.targetDate));

  const scores = logs.map((l) => l.conditionScore).filter((v): v is number => typeof v === "number");
  const moods = logs.map((l) => l.moodScore).filter((v): v is number => typeof v === "number");

  const measured = logs.filter((l) => typeof l.temperature === "number");
  const temps = measured.map((l) => l.temperature as number);
  const measuredDates = new Set(measured.map((l) => l.targetDate));
  const feverDates = new Set(measured.filter((l) => (l.temperature as number) >= FEVER_C).map((l) => l.targetDate));
  const notMeasured = [...recordedDates].filter((d) => !measuredDates.has(d)).length;

  const painLogs = logs.filter((l) => l.jointPain.length > 0);
  const bySite: Record<string, Set<string>> = {};
  for (const l of painLogs) for (const p of l.jointPain) (bySite[p.site] ??= new Set()).add(l.targetDate);
  const painSeverities = painLogs.flatMap((l) => l.jointPain.map((p) => p.severity));

  const symptomDays = new Map<string, Set<string>>();
  for (const l of logs) for (const s of l.symptoms) {
    if (!symptomDays.has(s.name)) symptomDays.set(s.name, new Set());
    symptomDays.get(s.name)!.add(l.targetDate);
  }
  const symptoms = [...symptomDays.entries()]
    .map(([name, days]) => ({ name, days: days.size }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  const sleeps = logs.map((l) => l.sleepHours).filter((v): v is number => typeof v === "number");

  const adherence = new Map<string, { taken: number; notTaken: number; unconfirmed: number }>();
  for (const l of logs) for (const m of l.medications) {
    if (m.type !== "regular" || !m.name) continue;
    const row = adherence.get(m.name) ?? { taken: 0, notTaken: 0, unconfirmed: 0 };
    if (m.intake === "notTaken") row.notTaken += 1;
    else if (m.intake === "unconfirmed") row.unconfirmed += 1;
    else row.taken += 1;
    adherence.set(m.name, row);
  }

  const labFrom = shiftIso(today, -(LAB_LOOKBACK_DAYS - 1));
  const labLogs = allLogs
    .filter((l) => !l.skipped && l.targetDate >= labFrom && l.targetDate <= today)
    .sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1));
  const latestLabs: ChatDataSummary["latestLabs"] = {};
  const LAB_KEYS: [keyof NonNullable<DailyLog["labs"]>, string][] = [
    ["ferritinNgMl", "フェリチン(ng/mL)"],
    ["plateletsPerUl", "血小板(/μL)"],
    ["wbcPerUl", "WBC(/μL)"],
    ["astUL", "AST(U/L)"],
    ["altUL", "ALT(U/L)"],
    ["crpMgDl", "CRP(mg/dL)"],
    ["esrMmH", "ESR(mm/h)"],
  ];
  for (const [key, label] of LAB_KEYS) {
    const hit = labLogs.find((l) => typeof l.labs?.[key] === "number");
    if (hit) latestLabs[label] = { value: hit.labs![key] as number, date: hit.targetDate };
  }

  // アプリ自身の警告の状態。チャットはこれを尊重して伝えるだけで、独自に緊急性を判定しない
  const f10 = checkEmergency(allLogs, registeredMedications);
  const danger = checkDanger(allLogs);

  const summary: ChatDataSummary = {
    today,
    window: { from, to: today, days: SUMMARY_WINDOW_DAYS },
    records: {
      recordedDays: recordedDates.size,
      skippedDays: skippedDates.size,
      unrecordedDays: SUMMARY_WINDOW_DAYS - recordedDates.size,
      quickInputDays: quickDates.size,
    },
    conditionScore: {
      n: scores.length,
      avg: avg(scores),
      min: scores.length ? Math.min(...scores) : null,
      max: scores.length ? Math.max(...scores) : null,
    },
    moodScore: { n: moods.length, avg: avg(moods) },
    temperature: {
      measuredDays: measuredDates.size,
      notMeasuredRecordedDays: notMeasured,
      maxCelsius: temps.length ? Math.max(...temps) : null,
      daysAtOrAbove38: feverDates.size,
    },
    fatigueUnusualDays: new Set(logs.filter((l) => l.fatigueUnusual).map((l) => l.targetDate)).size,
    jointPain: {
      daysWithPain: new Set(painLogs.map((l) => l.targetDate)).size,
      bySiteDays: Object.fromEntries(Object.entries(bySite).map(([k, v]) => [k, v.size])),
      avgSeverity: avg(painSeverities),
    },
    symptoms,
    sleep: { recordedDays: sleeps.length, avgHours: avg(sleeps) },
    dangerSymptomRecords: logs
      .filter((l) => (l.dangerSymptoms?.length ?? 0) > 0)
      .map((l) => ({ date: l.targetDate, symptoms: l.dangerSymptoms as string[] }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    regularMedications: [...adherence.entries()].map(([name, v]) => ({ name, ...v })),
    latestLabs,
    appState: {
      f10: {
        triggered: f10.triggered,
        reasonGroups: f10.reasonGroups.map((g) => ({ category: g.category, reasons: g.reasons })),
        recordedDaysInLast7: f10.dataQuality.recordedDays,
        insufficientData: f10.dataQuality.insufficient,
      },
      danger: { triggered: danger.triggered, entries: danger.entries },
    },
    knownLimitations: KNOWN_LIMITATIONS,
  };

  if (options.includeMemos) {
    summary.recentMemos = logs
      .filter((l) => l.memo && l.memo.trim().length > 0)
      .sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1))
      .slice(0, MAX_MEMOS)
      .map((l) => ({ date: l.targetDate, text: (l.memo as string).trim().slice(0, MAX_MEMO_CHARS) }));
  }

  return summary;
}
