import type { RegisteredMedication } from "@/types/vitalog";

/**
 * ある対象日に、登録済みの定期薬が「服用していたはず」の期間内かどうかを判定する。
 * バックフィル入力(過去日を選んでの後入力)で、まだ処方されていなかった薬や
 * 既に中止していた薬をチェックリストに出してしまわないために使う。
 *
 * startDate/endDateが無い(旧データ)場合は、常に表示可能として扱う。
 */
export function isMedicationApplicableOnDate(
  med: RegisteredMedication,
  targetDate: string
): boolean {
  if (med.startDate && targetDate < med.startDate) return false;
  if (med.endDate && targetDate > med.endDate) return false;
  return true;
}
