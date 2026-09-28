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
 */

const FEVER_THRESHOLD_C = 38.0;
const SUSTAINED_DAYS = 3;
const FERRITIN_THRESHOLD_NG_ML = 500;
const PLATELET_LOW_THRESHOLD = 100_000;
/**
 * 判定対象を実際の「今日」から見て直近この日数以内の記録に限定する。
 * これが無いと、過去の処方箋・検査結果を後から一括インポートした際に、
 * それが記録全体の中で最新の日付だった場合、何年も前の重い数値が
 * 「現在の状態」として誤って警告を出してしまう(発病当初のデータ等)。
 */
const EMERGENCY_LOOKBACK_DAYS = 14;

export interface EmergencyCheckResult {
  triggered: boolean;
  reasons: string[];
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

  if (sustainedFever) {
    reasons.push(
      `${sustainedDaysThreshold}日以上、${FEVER_THRESHOLD_C}℃以上の高熱が続いています` +
        (sensitive ? "(ライフステージ移行の要注意期間中のため通常より敏感な閾値です)" : "")
    );
  }
  if (sustainedFatigue) {
    reasons.push("複数日にわたり「普段と違う強い倦怠感」が記録されています");
  }

  const latest = nonSkipped[0];
  const latestFerritin = latest?.labs?.ferritinNgMl;
  const latestPlatelets = latest?.labs?.plateletsPerUl;

  if (typeof latestFerritin === "number" && latestFerritin >= FERRITIN_THRESHOLD_NG_ML) {
    reasons.push(`フェリチン値が${latestFerritin}ng/mLと高値です`);
  }
  if (typeof latestPlatelets === "number" && latestPlatelets <= PLATELET_LOW_THRESHOLD) {
    reasons.push(`血小板数が${latestPlatelets}/μLと低値です`);
  }

  const labFlagPresent =
    (typeof latestFerritin === "number" && latestFerritin >= FERRITIN_THRESHOLD_NG_ML) ||
    (typeof latestPlatelets === "number" && latestPlatelets <= PLATELET_LOW_THRESHOLD);

  const triggered = (sustainedFever && sustainedFatigue) || labFlagPresent;

  return { triggered, reasons };
}
