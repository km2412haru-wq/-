"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadDailyLogs, saveDailyLogs } from "@/lib/storage";
import type { DailyLog } from "@/types/vitalog";

export type DailyLogDraft = Omit<
  DailyLog,
  "id" | "recordedAt" | "createdAt" | "updatedAt"
>;

/** 体調記録(F1)のCRUDとlocalStorageへの永続化を担うフック */
export function useDailyLogs() {
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [ready, setReady] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setDailyLogs(loadDailyLogs());
    setReady(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      // 初回ロード直後の空配列での上書き保存を防ぐ
      isFirstLoad.current = false;
      return;
    }
    if (!ready) return;
    saveDailyLogs(dailyLogs);
  }, [dailyLogs, ready]);

  const addLog = useCallback((draft: DailyLogDraft): DailyLog => {
    const now = new Date().toISOString();
    const entry: DailyLog = {
      ...draft,
      id: generateId(),
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    setDailyLogs((prev) =>
      [...prev, entry].sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1))
    );
    return entry;
  }, []);

  const updateLog = useCallback((id: string, changes: Partial<DailyLog>) => {
    setDailyLogs((prev) =>
      prev.map((log) =>
        log.id === id
          ? { ...log, ...changes, updatedAt: new Date().toISOString() }
          : log
      )
    );
  }, []);

  const deleteLog = useCallback((id: string) => {
    setDailyLogs((prev) => prev.filter((log) => log.id !== id));
  }, []);

  return { dailyLogs, ready, addLog, updateLog, deleteLog };
}
