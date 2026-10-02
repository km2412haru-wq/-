import { DEFAULT_SYMPTOM_NAMES, type DailyLog } from "@/types/vitalog";
import { isRecordedDay } from "@/lib/logKind";

/**
 * 簡易入力で「症状あり」だけを選び、症状名を選ばなかった場合に記録する名前。
 * 頻度順チップや入力候補に混ざらないよう、頻度集計からは除外する。
 */
export const UNSPECIFIED_SYMPTOM_NAME = "症状あり(詳細未入力)";

export interface SymptomChipData {
  /** 症状名ごとの記録日数(スキップ日・詳細未入力は除く) */
  frequency: Record<string, number>;
  /** 常設チップ(既定候補+2回以上記録された自由入力)。記録頻度の高い順 */
  chipNames: string[];
  /** 自由入力欄の候補(過去に使ったが、まだ常設チップ化されていない症状名) */
  suggestions: string[];
}

/** 症状チップの並び順・自由入力のチップ昇格・入力候補を、過去の記録頻度から算出する */
export function computeSymptomChips(logs: DailyLog[]): SymptomChipData {
  const frequency: Record<string, number> = {};
  for (const log of logs) {
    if (!isRecordedDay(log)) continue;
    for (const s of log.symptoms) {
      if (s.name === UNSPECIFIED_SYMPTOM_NAME) continue;
      frequency[s.name] = (frequency[s.name] ?? 0) + 1;
    }
  }

  const isDefault = (name: string) => (DEFAULT_SYMPTOM_NAMES as readonly string[]).includes(name);
  const promoted = Object.keys(frequency).filter((name) => !isDefault(name) && frequency[name] >= 2);
  const chipNames = Array.from(new Set<string>([...DEFAULT_SYMPTOM_NAMES, ...promoted])).sort(
    (a, b) => (frequency[b] ?? 0) - (frequency[a] ?? 0)
  );
  const suggestions = Object.keys(frequency)
    .filter((name) => !chipNames.includes(name))
    .sort((a, b) => frequency[b] - frequency[a]);

  return { frequency, chipNames, suggestions };
}
