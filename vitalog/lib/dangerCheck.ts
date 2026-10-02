import type { DailyLog } from "@/types/vitalog";
import { isRecordedDay } from "@/lib/logKind";
import { localTodayIso } from "@/lib/dateUtil";

/**
 * Danger層: 記録された危険症状に基づく、医療機関への相談の促し。
 *
 * F10(lib/emergencyCheck.ts)がAOSDの活動性・再燃を推定するロジックなのに対し、
 * こちらは「AOSDの再燃かどうかに関係なく、明らかに危険な症状が記録された」ことだけを見る。
 * 両者は意図的に完全に独立させており、片方が発火しなくてももう片方には影響しない。
 * 診断ではなく、あくまで相談を検討するための機械的な通知。
 */

/**
 * 実際の今日から見て、この日数前までの記録を対象にする(0=今日のみ、1=今日と昨日)。
 * 後入力や過去記録のインポートで、何日も前の症状が「今」の警告になるのを避けるための上限。
 * 昨日を含めるのは、前夜に記録した症状が翌朝にまだ気付かれていない場合を拾うため。
 */
const DANGER_LOOKBACK_DAYS = 1;

export interface DangerEntry {
  date: string;
  symptoms: string[];
}

export interface DangerCheckResult {
  triggered: boolean;
  entries: DangerEntry[];
}

function todayIso(): string {
  return localTodayIso();
}

function daysBefore(today: string, target: string): number {
  return Math.round((new Date(today).getTime() - new Date(target).getTime()) / 86_400_000);
}

export function checkDanger(
  dailyLogs: DailyLog[],
  /** 判定の基準日(YYYY-MM-DD)。省略時は端末のローカルの今日 */
  options: { today?: string } = {}
): DangerCheckResult {
  const today = options.today ?? todayIso();
  const entries = dailyLogs
    .filter((l) => {
      if (!isRecordedDay(l)) return false;
      const diff = daysBefore(today, l.targetDate);
      return diff >= 0 && diff <= DANGER_LOOKBACK_DAYS;
    })
    .filter((l) => (l.dangerSymptoms?.length ?? 0) > 0)
    .map((l) => ({ date: l.targetDate, symptoms: l.dangerSymptoms as string[] }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return { triggered: entries.length > 0, entries };
}
