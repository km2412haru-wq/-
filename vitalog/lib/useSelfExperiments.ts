"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadSelfExperiments, saveSelfExperiments } from "@/lib/storage";
import type { SelfExperiment } from "@/types/vitalog";

/** F12-2: セルフA/Bテストの介入宣言のCRUD */
export function useSelfExperiments() {
  const [selfExperiments, setSelfExperiments] = useState<SelfExperiment[]>([]);
  const [ready, setReady] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setSelfExperiments(loadSelfExperiments());
    setReady(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!ready) return;
    saveSelfExperiments(selfExperiments);
  }, [selfExperiments, ready]);

  const addExperiment = useCallback((description: string, startDate: string) => {
    const entry: SelfExperiment = {
      id: generateId(),
      description,
      startDate,
      createdAt: new Date().toISOString(),
    };
    setSelfExperiments((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const endExperiment = useCallback((id: string, endDate: string) => {
    setSelfExperiments((prev) => prev.map((e) => (e.id === id ? { ...e, endDate } : e)));
  }, []);

  const deleteExperiment = useCallback((id: string) => {
    setSelfExperiments((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { selfExperiments, ready, addExperiment, endExperiment, deleteExperiment };
}
