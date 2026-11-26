import { addDaysIso } from "@/lib/dateUtil";
import { getFeverThreshold } from "@/lib/emergencyCheck";
import { isRecordedDay } from "@/lib/logKind";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

/**
 * 「今日は問題なし」の簡易入力で、保存の前に「いつもと違うようです。詳しく記録しますか?」と案内する条件。
 * 押し切って「問題なし」と記録してしまうのを防ぐための案内で、保存を止めはしない(診断でもない)。
 *
 * 体温と危険症状・倦怠感は、F10・Danger層と同じ基準を使い、別の閾値を作らない。
 * 体調スコアの低下は、F10に無い比較なので【暫定・主治医確認待ち】の値で、画面にもその旨を出す。
 */

/** 直近の記録の平均より、この値以上低い体調スコアを「いつもと違う」とみなす【暫定・要確認】 */
export const QUICK_SCORE_DROP_THRESHOLD = 2;
/** 比較に使う、直近の体調スコアの件数 */
export const QUICK_SCORE_BASELINE_COUNT = 3;
/** 比較に最低限必要な、直近の体調スコアの件数(これ未満なら比較しない) */
export const QUICK_SCORE_MIN_BASELINE = 2;

export interface QuickGuidanceInput {
  temperature?: number;
  conditionScore?: number;
  fatigueUnusual: boolean;
  dangerSymptoms: string[];
}

export interface QuickGuidance {
  needed: boolean;
  reasons: string[];
}

/**
 * 入力が「いつもと違う」かを判定する。
 * @param history 記録済みの日次記録(今日より前の、体調を記録した日だけを比較に使う)
 */
export function evaluateQuickGuidance(
  input: QuickGuidanceInput,
  history: DailyLog[],
  registeredMedications: RegisteredMedication[],
  today: string
): QuickGuidance {
  const reasons: string[] = [];

  if (input.dangerSymptoms.length > 0) {
    reasons.push(`危険な症状が選ばれています(${input.dangerSymptoms.join("、")})`);
  }
  if (input.fatigueUnusual) {
    reasons.push("「普段と違う強い倦怠感」が選ばれています");
  }

  const threshold = getFeverThreshold(registeredMedications);
  if (typeof input.temperature === "number" && Number.isFinite(input.temperature) && input.temperature >= threshold) {
    reasons.push(`体温が${input.temperature}℃です(目安: ${threshold}℃以上)`);
  }

  if (typeof input.conditionScore === "number") {
    const baseline = history
      .filter((l) => isRecordedDay(l) && l.targetDate < today && typeof l.conditionScore === "number")
      .sort((a, b) => (a.targetDate < b.targetDate ? 1 : a.targetDate > b.targetDate ? -1 : 0))
      .slice(0, QUICK_SCORE_BASELINE_COUNT)
      .map((l) => l.conditionScore as number);
    if (baseline.length >= QUICK_SCORE_MIN_BASELINE) {
      const avg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
      const drop = avg - input.conditionScore;
      if (drop >= QUICK_SCORE_DROP_THRESHOLD) {
        reasons.push(
          `体調スコアが直近${baseline.length}件の平均(${Math.round(avg * 10) / 10})より${Math.round(drop * 10) / 10}下がっています(暫定の目安)`
        );
      }
    }
  }

  return { needed: reasons.length > 0, reasons };
}

/**
 * 直近に測った体温(参考表示用)。**入力欄には入れない**(測っていない日に前回の値が
 * 今日の測定として記録されるのを防ぐため)。今日より前で、最も新しい測定値を返す。
 */
export function latestMeasuredTemperature(
  history: DailyLog[],
  today: string
): { value: number; date: string } | null {
  const hit = history
    .filter((l) => !l.skipped && l.targetDate < today && typeof l.temperature === "number")
    .sort((a, b) => (a.targetDate < b.targetDate ? 1 : a.targetDate > b.targetDate ? -1 : 0))[0];
  if (!hit) return null;
  return { value: hit.temperature as number, date: hit.targetDate };
}

/** 「前回の体温」を出す期間(日)。古い値を「前回」として見せ続けない */
export const LAST_TEMPERATURE_MAX_AGE_DAYS = 14;

export function recentMeasuredTemperature(
  history: DailyLog[],
  today: string
): { value: number; date: string } | null {
  const last = latestMeasuredTemperature(history, today);
  if (!last) return null;
  return last.date >= addDaysIso(today, -LAST_TEMPERATURE_MAX_AGE_DAYS) ? last : null;
}
