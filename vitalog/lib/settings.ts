/** アプリ全体の軽量な個人設定。localStorageに直接キーごとに保存する(記録データ本体とは別枠)。 */

const LIFE_STAGE_DATE_KEY = "vitalog:settings:lifeStageDate";

export function loadLifeStageDateOverride(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LIFE_STAGE_DATE_KEY);
}

export function saveLifeStageDateOverride(dateStr: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIFE_STAGE_DATE_KEY, dateStr);
}

export function clearLifeStageDateOverride(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LIFE_STAGE_DATE_KEY);
}
