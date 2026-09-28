/**
 * F12-4: ライフステージ移行監視モード。
 * 2027年のAmazon Japan入社(要件定義書より、日本の一般的な入社時期である4月を仮定)前後を
 * 「要注意期間」として自動フラグする。高校→大学の生活変化で再燃した実体験に基づく機能。
 *
 * 日付がずれた場合はここを直接書き換える(設定UIは持たない軽量実装)。
 */
export const LIFE_STAGE_TRANSITION_DATE = "2027-04-01";
const WINDOW_DAYS_BEFORE = 90;
const WINDOW_DAYS_AFTER = 90;

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function isInLifeStageTransitionWindow(dateStr?: string): boolean {
  const target = dateStr ?? new Date().toISOString().slice(0, 10);
  const diff = daysBetween(LIFE_STAGE_TRANSITION_DATE, target);
  return diff >= -WINDOW_DAYS_BEFORE && diff <= WINDOW_DAYS_AFTER;
}
