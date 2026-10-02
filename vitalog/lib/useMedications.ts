"use client";

import { useCallback } from "react";
import { generateId } from "@/lib/id";
import { updateStore } from "@/lib/storage";
import { patchById, removeById, upsertById } from "@/lib/storeOps";
import { useStoreSelect } from "@/lib/useStoreSelect";
import type { RegisteredMedication, TaperingEvent, VitalogStore } from "@/types/vitalog";

const EMPTY_MEDS: RegisteredMedication[] = [];
const EMPTY_EVENTS: TaperingEvent[] = [];

function selectMedications(store: VitalogStore): RegisteredMedication[] {
  return store.registeredMedications;
}

function selectEvents(store: VitalogStore): TaperingEvent[] {
  return [...store.taperingEvents].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * F2: 定期薬・頓服マスタと減増薬(テーパリング)履歴のCRUD。
 * 保存の方式はuseDailyLogsと同じ(最新を読み直してid単位で適用。成否を返す)。
 */
export function useMedications() {
  const { value: registeredMedications, ready: medsReady } = useStoreSelect(selectMedications, EMPTY_MEDS);
  const { value: taperingEvents, ready: eventsReady } = useStoreSelect(selectEvents, EMPTY_EVENTS);

  const addMedication = useCallback(
    (input: Omit<RegisteredMedication, "id" | "createdAt" | "active">): RegisteredMedication | null => {
      const entry: RegisteredMedication = {
        ...input,
        id: generateId(),
        active: true,
        createdAt: new Date().toISOString(),
      };
      const ok = updateStore((store) => ({
        ...store,
        registeredMedications: upsertById(store.registeredMedications, entry),
      }));
      return ok ? entry : null;
    },
    []
  );

  const updateMedication = useCallback((id: string, changes: Partial<RegisteredMedication>): boolean => {
    return updateStore((store) => ({
      ...store,
      registeredMedications: patchById(store.registeredMedications, id, (m) => ({ ...m, ...changes })),
    }));
  }, []);

  const deleteMedication = useCallback((id: string): boolean => {
    return updateStore((store) => ({
      ...store,
      registeredMedications: removeById(store.registeredMedications, id),
    }));
  }, []);

  const addTaperingEvent = useCallback(
    (input: Omit<TaperingEvent, "id" | "createdAt">): TaperingEvent | null => {
      const entry: TaperingEvent = {
        ...input,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const ok = updateStore((store) => ({
        ...store,
        taperingEvents: upsertById(store.taperingEvents, entry),
      }));
      return ok ? entry : null;
    },
    []
  );

  const deleteTaperingEvent = useCallback((id: string): boolean => {
    return updateStore((store) => ({ ...store, taperingEvents: removeById(store.taperingEvents, id) }));
  }, []);

  return {
    registeredMedications,
    taperingEvents,
    ready: medsReady && eventsReady,
    addMedication,
    updateMedication,
    deleteMedication,
    addTaperingEvent,
    deleteTaperingEvent,
  };
}
