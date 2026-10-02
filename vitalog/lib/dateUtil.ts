/**
 * 日付(YYYY-MM-DD)の扱いを一箇所に集約する。
 *
 * 規則:
 *  - 「今日」は端末のローカルの日付(localTodayIso)。`new Date().toISOString().slice(0, 10)` は
 *    UTCの日付なので、日本(UTC+9)では0:00〜8:59に前日になる。使わない。
 *  - 日付文字列の計算(日数の加減・差)は、端末のタイムゾーンに依存しないUTC演算で行う
 *    (`new Date("YYYY-MM-DDT00:00:00")` は端末の時刻として解釈され、setDate→toISOStringで
 *    東の時刻帯では1日戻る)。
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** 端末のローカル日付(YYYY-MM-DD) */
export function localTodayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 日付文字列に日数を足し引きする(タイムゾーン非依存) */
export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 2つの日付文字列の差(b - a、日数。タイムゾーン非依存) */
export function daysBetweenIso(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
