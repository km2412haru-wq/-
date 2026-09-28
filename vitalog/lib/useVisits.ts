"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadVisits, saveVisits } from "@/lib/storage";
import type { Visit } from "@/types/vitalog";

/** 通院記録のCRUD */
export function useVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [ready, setReady] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setVisits(loadVisits());
    setReady(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!ready) return;
    saveVisits(visits);
  }, [visits, ready]);

  const addVisit = useCallback(
    (input: Omit<Visit, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const entry: Visit = { ...input, id: generateId(), createdAt: now, updatedAt: now };
      setVisits((prev) =>
        [entry, ...prev].sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1))
      );
      return entry;
    },
    []
  );

  const deleteVisit = useCallback((id: string) => {
    setVisits((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { visits, ready, addVisit, deleteVisit };
}
