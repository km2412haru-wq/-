import type { DailyLog, LoadLevel } from "@/types/vitalog";
import { isRecordedDay } from "@/lib/logKind";
import { addDaysIso } from "@/lib/dateUtil";

/**
 * F5/F6/F11: ラグ相関分析(叩き台)。
 *
 * 要件定義書では「データ量に応じて段階的に解禁(〜30日は単純集計のみ、30日〜で基本相関...)」
 * という設計だったが、本人の希望により「データが少ない段階でも、あるだけの記録で計算し、
 * サンプル数に応じた信頼度の目安を添えて常に表示する」方針に変更した。
 * 30日未満は完全に非表示にするのではなく、n(サンプル数)が少ないほど「参考程度」という
 * ラベルを付けて出し続けることで、段階的にではなく連続的に信頼度が上がっていく見せ方にしている。
 *
 * pandas/scipyは使わずTypeScriptで最小限のPearson相関係数のみを実装している
 * (統計的有意差検定はしていない。厳密な有意性検定・多重比較補正は将来の課題)。
 *
 * これはコアロジックの「叩き台」。閾値・変数の選定・表示の言い回しは本人のレビューを前提に
 * 設計しており、確定仕様ではない。
 */

/** これ未満のサンプル数では計算しても意味が薄いため除外する */
const MIN_SAMPLE_SIZE = 5;
/** これ未満の相関係数の絶対値は「関連なし」とみなして除外する(弱い相関の足切り) */
const MIN_ABS_CORRELATION = 0.3;
/** 何日後までの遅れを見るか */
const LAG_DAYS = [0, 1, 2, 3];
/** 一度に表示する上位件数 */
const MAX_FINDINGS = 8;

const LOAD_LEVEL_SCORE: Record<LoadLevel, number> = { 暇: 0, 普通: 1, 過密: 2 };

export type CorrelationConfidence = "参考程度" | "傾向あり" | "一定の信頼度";

export interface CorrelationFinding {
  predictorLabel: string;
  outcomeLabel: string;
  lagDays: number;
  /** Pearson相関係数(小数第2位に丸め) */
  r: number;
  /** サンプル数(ペアの日数) */
  n: number;
  confidence: CorrelationConfidence;
  /** 直近の記録日におけるpredictorの実測値(参考表示用) */
  latestPredictorValue?: number;
}

interface Variable {
  label: string;
  extract: (log: DailyLog) => number | undefined;
}

const addDays = addDaysIso;

function pearsonR(xs: number[], ys: number[]): number | undefined {
  const n = xs.length;
  if (n < 2) return undefined;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  if (denomX === 0 || denomY === 0) return undefined;
  return num / Math.sqrt(denomX * denomY);
}

function confidenceLabel(n: number): CorrelationConfidence {
  if (n >= 30) return "一定の信頼度";
  if (n >= 15) return "傾向あり";
  return "参考程度";
}

/** 簡易入力は関節痛を聞いていない(=0ではなく未入力)ので、結果変数の値として使わない */
function jointPainAvgSeverity(log: DailyLog): number | undefined {
  if (log.entryMode === "quick") return undefined;
  if (log.jointPain.length === 0) return 0;
  return log.jointPain.reduce((sum, p) => sum + p.severity, 0) / log.jointPain.length;
}

/** 簡易入力の症状は強さを聞かず既定値を入れているため、強さの合計には使わない */
function symptomsSeveritySum(log: DailyLog): number | undefined {
  if (log.entryMode === "quick") return undefined;
  return log.symptoms.reduce((sum, s) => sum + s.severity, 0);
}

export function computeLagCorrelations(logs: DailyLog[]): CorrelationFinding[] {
  const nonSkipped = logs.filter(isRecordedDay);
  const byDate = new Map(nonSkipped.map((l) => [l.targetDate, l]));
  const sortedDates = Array.from(byDate.keys()).sort();
  if (sortedDates.length === 0) return [];

  // 気圧の前日比を事前計算(前日の記録が無ければ算出しない)。
  // 「気圧が3hPa以上下がると2〜3日後に関節痛」という要件定義書の具体例に対応するための変数。
  const pressureDeltaByDate = new Map<string, number>();
  for (const date of sortedDates) {
    const log = byDate.get(date);
    const pressure = log?.environment?.pressureHpa;
    if (typeof pressure !== "number") continue;
    const prevLog = byDate.get(addDays(date, -1));
    const prevPressure = prevLog?.environment?.pressureHpa;
    if (typeof prevPressure === "number") {
      pressureDeltaByDate.set(date, pressure - prevPressure);
    }
  }

  const predictors: Variable[] = [
    { label: "睡眠時間", extract: (l) => l.sleepHours },
    {
      label: "生活負荷",
      extract: (l) => (l.loadLevel ? LOAD_LEVEL_SCORE[l.loadLevel] : undefined),
    },
    { label: "気圧の前日比", extract: (l) => pressureDeltaByDate.get(l.targetDate) },
    { label: "気分スコア", extract: (l) => l.moodScore },
  ];

  const outcomes: Variable[] = [
    { label: "体調スコア", extract: (l) => l.conditionScore },
    { label: "関節痛の強さ", extract: jointPainAvgSeverity },
    { label: "症状の強さ(合計)", extract: symptomsSeveritySum },
  ];

  const latestDate = sortedDates[sortedDates.length - 1];
  const latestLog = byDate.get(latestDate);

  const findings: CorrelationFinding[] = [];

  for (const predictor of predictors) {
    for (const outcome of outcomes) {
      for (const lag of LAG_DAYS) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const date of sortedDates) {
          const log = byDate.get(date);
          const x = log ? predictor.extract(log) : undefined;
          if (x === undefined) continue;
          const outcomeLog = byDate.get(addDays(date, lag));
          const y = outcomeLog ? outcome.extract(outcomeLog) : undefined;
          if (y === undefined) continue;
          xs.push(x);
          ys.push(y);
        }
        if (xs.length < MIN_SAMPLE_SIZE) continue;
        const r = pearsonR(xs, ys);
        if (r === undefined || Math.abs(r) < MIN_ABS_CORRELATION) continue;

        findings.push({
          predictorLabel: predictor.label,
          outcomeLabel: outcome.label,
          lagDays: lag,
          r: Math.round(r * 100) / 100,
          n: xs.length,
          confidence: confidenceLabel(xs.length),
          latestPredictorValue: latestLog ? predictor.extract(latestLog) : undefined,
        });
      }
    }
  }

  // 効果量(|r|)とサンプル数の両方を加味して並べ替える(サンプルが極端に少ない偶然の高相関を上位に出しすぎないため)
  findings.sort((a, b) => Math.abs(b.r) * Math.sqrt(b.n) - Math.abs(a.r) * Math.sqrt(a.n));
  return findings.slice(0, MAX_FINDINGS);
}
