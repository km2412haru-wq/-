"use client";

import { useCallback } from "react";
import { generateId } from "@/lib/id";
import { updateStore } from "@/lib/storage";
import { removeById, upsertById } from "@/lib/storeOps";
import { useStoreSelect } from "@/lib/useStoreSelect";
import type { Visit, VitalogStore } from "@/types/vitalog";

const EMPTY: Visit[] = [];

function selectVisits(store: VitalogStore): Visit[] {
  return [...store.visits].sort((a, b) =>
    a.visitDate < b.visitDate ? 1 : a.visitDate > b.visitDate ? -1 : 0
  );
}

/** 通院記録のCRUD(保存の方式はuseDailyLogsと同じ) */
export function useVisits() {
  const { value: visits, ready } = useStoreSelect(selectVisits, EMPTY);

  const addVisit = useCallback(
    (input: Omit<Visit, "id" | "createdAt" | "updatedAt">): Visit | null => {
      const now = new Date().toISOString();
      const entry: Visit = { ...input, id: generateId(), createdAt: now, updatedAt: now };
      const ok = updateStore((store) => ({ ...store, visits: upsertById(store.visits, entry) }));
      return ok ? entry : null;
    },
    []
  );

  const deleteVisit = useCallback((id: string): boolean => {
    return updateStore((store) => ({ ...store, visits: removeById(store.visits, id) }));
  }, []);

  return { visits, ready, addVisit, deleteVisit };
}
