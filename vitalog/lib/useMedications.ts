"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import {
  loadRegisteredMedications,
  loadTaperingEvents,
  saveRegisteredMedications,
  saveTaperingEvents,
} from "@/lib/storage";
import type { RegisteredMedication, TaperingEvent } from "@/types/vitalog";

/** F2: 定期薬・頓服マスタと減増薬(テーパリング)履歴のCRUD */
export function useMedications() {
  const [registeredMedications, setRegisteredMedications] = useState<RegisteredMedication[]>([]);
  const [taperingEvents, setTaperingEvents] = useState<TaperingEvent[]>([]);
  const [ready, setReady] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setRegisteredMedications(loadRegisteredMedications());
    setTaperingEvents(loadTaperingEvents());
    setReady(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!ready) return;
    saveRegisteredMedications(registeredMedications);
    saveTaperingEvents(taperingEvents);
  }, [registeredMedications, taperingEvents, ready]);

  const addMedication = useCallback(
    (input: Omit<RegisteredMedication, "id" | "createdAt" | "active">) => {
      const entry: RegisteredMedication = {
        ...input,
        id: generateId(),
        active: true,
        createdAt: new Date().toISOString(),
      };
      setRegisteredMedications((prev) => [entry, ...prev]);
      return entry;
    },
    []
  );

  const updateMedication = useCallback((id: string, changes: Partial<RegisteredMedication>) => {
    setRegisteredMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...changes } : m))
    );
  }, []);

  const deleteMedication = useCallback((id: string) => {
    setRegisteredMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addTaperingEvent = useCallback(
    (input: Omit<TaperingEvent, "id" | "createdAt">) => {
      const entry: TaperingEvent = {
        ...input,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setTaperingEvents((prev) =>
        [entry, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1))
      );
      return entry;
    },
    []
  );

  const deleteTaperingEvent = useCallback((id: string) => {
    setTaperingEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    registeredMedications,
    taperingEvents,
    ready,
    addMedication,
    updateMedication,
    deleteMedication,
    addTaperingEvent,
    deleteTaperingEvent,
  };
}
