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
  // 変更操作(add/update/delete等)を行ったインスタンスだけが保存する。
  // 読み込んだだけのインスタンスが保存すると、他のインスタンスが直前に保存した最新の内容を
  // 「読み込み時点の古い内容」で上書きして消してしまう(表示専用の利用側が後から
  // マウントされた場合に起きる)ため、変更していないインスタンスは保存しない。
  const dirty = useRef(false);

  useEffect(() => {
    setDailyLogs(loadDailyLogs());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
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
    dirty.current = true;
    setDailyLogs((prev) =>
      [...prev, entry].sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1))
    );
    return entry;
  }, []);

  const updateLog = useCallback((id: string, changes: Partial<DailyLog>) => {
    dirty.current = true;
    setDailyLogs((prev) =>
      prev.map((log) =>
        log.id === id
          ? { ...log, ...changes, updatedAt: new Date().toISOString() }
          : log
      )
    );
  }, []);

  const deleteLog = useCallback((id: string) => {
    dirty.current = true;
    setDailyLogs((prev) => prev.filter((log) => log.id !== id));
  }, []);

  return { dailyLogs, ready, addLog, updateLog, deleteLog };
}
