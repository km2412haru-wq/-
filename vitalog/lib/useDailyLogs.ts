"use client";

import { useCallback } from "react";
import { generateId } from "@/lib/id";
import { updateStore } from "@/lib/storage";
import { patchById, removeById, upsertById } from "@/lib/storeOps";
import { useStoreSelect } from "@/lib/useStoreSelect";
import type { DailyLog, VitalogStore } from "@/types/vitalog";

export type DailyLogDraft = Omit<
  DailyLog,
  "id" | "recordedAt" | "createdAt" | "updatedAt"
>;

const EMPTY: DailyLog[] = [];

function selectLogs(store: VitalogStore): DailyLog[] {
  // 日付の新しい順(同じ日は保存順のまま。比較が0を返すことで安定ソートになる)
  return [...store.dailyLogs].sort((a, b) =>
    a.targetDate < b.targetDate ? 1 : a.targetDate > b.targetDate ? -1 : 0
  );
}

/**
 * 体調記録(F1)のCRUD。保存されているデータの写しを返し、変更は保存の瞬間に読み直した
 * 最新のデータへ、id単位で適用する(別のタブ・別のフックインスタンスの記録を消さない)。
 * 変更操作は、保存できたかどうか(成功ならtrue / 追加は作った記録、失敗ならnull)を返す。
 * 失敗した場合は画面の状態も変えない(保存されていない記録を表示しない)。
 */
export function useDailyLogs() {
  const { value: dailyLogs, ready } = useStoreSelect(selectLogs, EMPTY);

  const addLog = useCallback((draft: DailyLogDraft): DailyLog | null => {
    const now = new Date().toISOString();
    const entry: DailyLog = {
      ...draft,
      id: generateId(),
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const ok = updateStore((store) => ({
      ...store,
      dailyLogs: upsertById(store.dailyLogs, entry, "end"),
    }));
    return ok ? entry : null;
  }, []);

  const updateLog = useCallback((id: string, changes: Partial<DailyLog>): boolean => {
    const updatedAt = new Date().toISOString();
    return updateStore((store) => ({
      ...store,
      dailyLogs: patchById(store.dailyLogs, id, (log) => ({ ...log, ...changes, updatedAt })),
    }));
  }, []);

  const deleteLog = useCallback((id: string): boolean => {
    return updateStore((store) => ({ ...store, dailyLogs: removeById(store.dailyLogs, id) }));
  }, []);

  return { dailyLogs, ready, addLog, updateLog, deleteLog };
}
