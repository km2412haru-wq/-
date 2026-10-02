import { loadLifeStageDateOverride } from "@/lib/settings";
import { localTodayIso } from "@/lib/dateUtil";

/**
 * F12-4: ライフステージ移行監視モード。
 * 2027年のAmazon Japan入社(要件定義書より、日本の一般的な入社時期である4月を仮定)前後を
 * 「要注意期間」として自動フラグする。高校→大学の生活変化で再燃した実体験に基づく機能。
 *
 * 日付は/settings画面から変更でき、localStorageに保存された値があればそちらを優先する。
 * 未設定の場合はこのデフォルト値を使う。
 */
export const LIFE_STAGE_TRANSITION_DATE_DEFAULT = "2027-04-01";
const WINDOW_DAYS_BEFORE = 90;
const WINDOW_DAYS_AFTER = 90;

export function getLifeStageTransitionDate(): string {
  return loadLifeStageDateOverride() ?? LIFE_STAGE_TRANSITION_DATE_DEFAULT;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function isInLifeStageTransitionWindow(dateStr?: string): boolean {
  const target = dateStr ?? localTodayIso();
  const transitionDate = getLifeStageTransitionDate();
  const diff = daysBetween(transitionDate, target);
  return diff >= -WINDOW_DAYS_BEFORE && diff <= WINDOW_DAYS_AFTER;
}
