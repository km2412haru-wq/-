"use client";

import { useCallback } from "react";
import { generateId } from "@/lib/id";
import { updateStore } from "@/lib/storage";
import { patchById, removeById, upsertById } from "@/lib/storeOps";
import { useStoreSelect } from "@/lib/useStoreSelect";
import type { SelfExperiment, VitalogStore } from "@/types/vitalog";

const EMPTY: SelfExperiment[] = [];

function selectExperiments(store: VitalogStore): SelfExperiment[] {
  return store.selfExperiments;
}

/** F12-2: セルフA/Bテストの介入宣言のCRUD(保存の方式はuseDailyLogsと同じ) */
export function useSelfExperiments() {
  const { value: selfExperiments, ready } = useStoreSelect(selectExperiments, EMPTY);

  const addExperiment = useCallback((description: string, startDate: string): SelfExperiment | null => {
    const entry: SelfExperiment = {
      id: generateId(),
      description,
      startDate,
      createdAt: new Date().toISOString(),
    };
    const ok = updateStore((store) => ({
      ...store,
      selfExperiments: upsertById(store.selfExperiments, entry),
    }));
    return ok ? entry : null;
  }, []);

  const endExperiment = useCallback((id: string, endDate: string): boolean => {
    return updateStore((store) => ({
      ...store,
      selfExperiments: patchById(store.selfExperiments, id, (e) => ({ ...e, endDate })),
    }));
  }, []);

  const deleteExperiment = useCallback((id: string): boolean => {
    return updateStore((store) => ({ ...store, selfExperiments: removeById(store.selfExperiments, id) }));
  }, []);

  return { selfExperiments, ready, addExperiment, endExperiment, deleteExperiment };
}
