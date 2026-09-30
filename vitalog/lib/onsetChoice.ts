/**
 * 症状の「いつから」入力の選択肢と、保存する発症日(`SymptomEntry.onsetDate`)との変換。
 * 既定は「この記録の日から」で、保存する値は無し(追加のタップは要らない)。
 * 発症日は記録の対象日(targetDate)からの相対で選ぶ。後入力で過去日を記録する場合も、
 * その日を基準に「1日前から」と選べる。
 */
export type OnsetChoice = "same" | "1" | "2" | "custom";

function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** 選択肢から保存する発症日を求める。「この記録の日から」・不正な日付指定は保存しない(undefined) */
export function onsetDateFromChoice(
  targetDate: string,
  choice: OnsetChoice,
  customDate: string
): string | undefined {
  if (choice === "1") return addDaysIso(targetDate, -1);
  if (choice === "2") return addDaysIso(targetDate, -2);
  if (choice === "custom") {
    // 記録の日より後の発症日は矛盾するため採用しない
    return isIsoDate(customDate) && customDate < targetDate ? customDate : undefined;
  }
  return undefined;
}

/** 保存されている発症日から、フォームの選択肢に戻す(「詳細を追記」のプリフィル用) */
export function choiceFromOnsetDate(
  targetDate: string,
  onsetDate: string | undefined
): { choice: OnsetChoice; customDate: string } {
  if (!onsetDate || !isIsoDate(onsetDate) || onsetDate >= targetDate) {
    return { choice: "same", customDate: "" };
  }
  const diff = dayNumber(targetDate) - dayNumber(onsetDate);
  if (diff === 1) return { choice: "1", customDate: "" };
  if (diff === 2) return { choice: "2", customDate: "" };
  return { choice: "custom", customDate: onsetDate };
}
