import { isInLifeStageTransitionWindow } from "@/lib/lifeStage";
import type { DailyLog } from "@/types/vitalog";

/**
 * F10: MAS(マクロファージ活性化症候群)等の重篤合併症を疑うべきパターンの
 * ルールベース一次スクリーニング。
 *
 * 重要: これは「診断」ではなく「受診を検討すべきサイン」の提示に過ぎない。
 * 閾値(38℃, フェリチン500ng/mL, 血小板10万/μL等)は山口基準等の一般的な
 * 目安を参考にした暫定値であり、個人差・主治医の判断を置き換えるものではない。
 * F5/F11で蓄積データからの個人ベースライン学習ができるようになれば、
 * この暫定閾値をパーソナライズ閾値に置き換える。
 *
 * ステロイド・NSAIDs服用中は発熱が薬理学的に抑制され、38℃まで上がらないまま
 * 再燃するケースがあるため、発熱に頼らない検知ルートとして「関節痛の急増」
 * 「皮疹の新規出現」を独立したOR条件として追加している(発熱条件自体は変更しない)。
 */

const FEVER_THRESHOLD_C = 38.0;
const SUSTAINED_DAYS = 3;
const FERRITIN_THRESHOLD_NG_ML = 500;
const PLATELET_LOW_THRESHOLD = 100_000;
/** 直近の記録と、その直前数件の平均とを比べて、平均強さがこれ以上上がっていたら急増とみなす */
const JOINT_PAIN_SPIKE_SEVERITY_DELTA = 2;
/** 関節痛急増・皮疹新規出現の判定に使う「直前の状態」のベースラインとして見る件数 */
const BASELINE_LOG_COUNT = 3;
/**
 * 判定対象を実際の「今日」から見て直近この日数以内の記録に限定する。
 * これが無いと、過去の処方箋・検査結果を後から一括インポートした際に、
 * それが記録全体の中で最新の日付だった場合、何年も前の重い数値が
 * 「現在の状態」として誤って警告を出してしまう(発病当初のデータ等)。
 */
const EMERGENCY_LOOKBACK_DAYS = 14;

export interface EmergencyReasonGroup {
  category: "発熱・倦怠感" | "検査値" | "症状の急変";
  reasons: string[];
}

export interface EmergencyCheckResult {
  triggered: boolean;
  reasons: string[];
  reasonGroups: EmergencyReasonGroup[];
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 直近の記録から連続した(1日以上空かない)日数分を取り出す */
function takeConsecutiveRecent(sortedDesc: DailyLog[], maxDays: number): DailyLog[] {
  const result: DailyLog[] = [];
  for (const log of sortedDesc) {
    if (result.length === 0) {
      result.push(log);
      continue;
    }
    const prev = result[result.length - 1];
    if (daysBetween(prev.targetDate, log.targetDate) <= 1.5) {
      result.push(log);
    } else {
      break;
    }
    if (result.length >= maxDays) break;
  }
  return result;
}

export function checkEmergency(dailyLogs: DailyLog[]): EmergencyCheckResult {
  const reasons: string[] = [];

  // F12-4: ライフステージ移行の要注意期間中は、普段より敏感な閾値で検知する
  const sensitive = isInLifeStageTransitionWindow();
  const sustainedDaysThreshold = sensitive ? SUSTAINED_DAYS - 1 : SUSTAINED_DAYS;
  const fatigueDaysThreshold = sensitive ? 1 : 2;

  const today = todayIso();
  const nonSkipped = dailyLogs
    .filter((l) => !l.skipped && daysBetween(l.targetDate, today) <= EMERGENCY_LOOKBACK_DAYS)
    .sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1));

  const recent = takeConsecutiveRecent(nonSkipped, sustainedDaysThreshold);

  const feverDays = recent.filter(
    (l) => typeof l.temperature === "number" && l.temperature >= FEVER_THRESHOLD_C
  );
  const fatigueDays = recent.filter((l) => l.fatigueUnusual);

  const sustainedFever = feverDays.length >= sustainedDaysThreshold;
  const sustainedFatigue = fatigueDays.length >= fatigueDaysThreshold;

  const feverFatigueReasons: string[] = [];
  if (sustainedFever) {
    feverFatigueReasons.push(
      `${sustainedDaysThreshold}日以上、${FEVER_THRESHOLD_C}℃以上の高熱が続いています` +
        (sensitive ? "(ライフステージ移行の要注意期間中のため通常より敏感な閾値です)" : "")
    );
  }
  if (sustainedFatigue) {
    feverFatigueReasons.push("複数日にわたり「普段と違う強い倦怠感」が記録されています");
  }

  const latest = nonSkipped[0];
  const latestFerritin = latest?.labs?.ferritinNgMl;
  const latestPlatelets = latest?.labs?.plateletsPerUl;

  const labReasons: string[] = [];
  if (typeof latestFerritin === "number" && latestFerritin >= FERRITIN_THRESHOLD_NG_ML) {
    labReasons.push(`フェリチン値が${latestFerritin}ng/mLと高値です`);
  }
  if (typeof latestPlatelets === "number" && latestPlatelets <= PLATELET_LOW_THRESHOLD) {
    labReasons.push(`血小板数が${latestPlatelets}/μLと低値です`);
  }

  const labFlagPresent = labReasons.length > 0;

  // ステロイド・NSAIDs服用中は発熱が抑制されうるため、発熱に頼らない検知ルートとして
  // 「関節痛の急増・新規部位」「皮疹の新規出現」を独立したOR条件として見る。
  // ベースラインは直近の記録(latest)より前のBASELINE_LOG_COUNT件の平均とする。
  const baseline = nonSkipped.slice(1, 1 + BASELINE_LOG_COUNT);
  const symptomChangeReasons: string[] = [];

  if (latest && latest.jointPain.length > 0 && baseline.length > 0) {
    const latestAvg = average(latest.jointPain.map((p) => p.severity));
    const baselineAvgs = baseline
      .map((l) => average(l.jointPain.map((p) => p.severity)))
      .filter((v): v is number => v !== undefined);
    const baselineAvg = baselineAvgs.length ? average(baselineAvgs) : undefined;
    const severitySpike =
      latestAvg !== undefined &&
      baselineAvg !== undefined &&
      latestAvg - baselineAvg >= JOINT_PAIN_SPIKE_SEVERITY_DELTA;

    const baselineSites = new Set(baseline.flatMap((l) => l.jointPain.map((p) => p.site)));
    const newSites = latest.jointPain.map((p) => p.site).filter((site) => !baselineSites.has(site));

    if (severitySpike) {
      symptomChangeReasons.push("関節痛の強さが直近に比べて急に上がっています");
    }
    if (newSites.length > 0) {
      symptomChangeReasons.push(`これまで無かった部位(${newSites.join("・")})に関節痛が広がっています`);
    }
  }

  if (latest && (latest.rash?.note || latest.rash?.sourcePhotoId)) {
    const hadRashBefore = baseline.some((l) => l.rash?.note || l.rash?.sourcePhotoId);
    if (!hadRashBefore) {
      symptomChangeReasons.push("これまで無かった皮疹が新しく記録されました");
    }
  }

  const symptomChangeFlagPresent = symptomChangeReasons.length > 0;

  const triggered =
    (sustainedFever && sustainedFatigue) || labFlagPresent || symptomChangeFlagPresent;

  const allGroups: EmergencyReasonGroup[] = [
    { category: "発熱・倦怠感", reasons: feverFatigueReasons },
    { category: "検査値", reasons: labReasons },
    { category: "症状の急変", reasons: symptomChangeReasons },
  ];
  const reasonGroups = allGroups.filter((g) => g.reasons.length > 0);

  reasons.push(...reasonGroups.flatMap((g) => g.reasons));

  return { triggered, reasons, reasonGroups };
}
