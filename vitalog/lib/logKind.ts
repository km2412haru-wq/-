import type { DailyLog } from "@/types/vitalog";

/**
 * 「その日の体調を記録した日」か。スキップした日と、検査値だけを取り込んだ日(labsOnly)は含まない。
 * 症状・体調を聞いていない日を「症状が無かった日」として数えないための共通の判定
 * (記録が無いこと ≠ 症状が無いこと)。検査値を読む処理は、この判定ではなく
 * `!log.skipped` で全ての記録を対象にすること。
 */
export function isRecordedDay(log: DailyLog): boolean {
  return !log.skipped && !log.labsOnly;
}
