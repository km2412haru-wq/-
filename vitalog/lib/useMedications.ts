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
  // 変更操作(add/update/delete等)を行ったインスタンスだけが保存する。
  // 読み込んだだけのインスタンスが保存すると、他のインスタンスが直前に保存した最新の内容を
  // 「読み込み時点の古い内容」で上書きして消してしまう(表示専用の利用側が後から
  // マウントされた場合に起きる)ため、変更していないインスタンスは保存しない。
  const dirty = useRef(false);

  useEffect(() => {
    setRegisteredMedications(loadRegisteredMedications());
    setTaperingEvents(loadTaperingEvents());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
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
      dirty.current = true;
      setRegisteredMedications((prev) => [entry, ...prev]);
      return entry;
    },
    []
  );

  const updateMedication = useCallback((id: string, changes: Partial<RegisteredMedication>) => {
    dirty.current = true;
    setRegisteredMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...changes } : m))
    );
  }, []);

  const deleteMedication = useCallback((id: string) => {
    dirty.current = true;
    setRegisteredMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addTaperingEvent = useCallback(
    (input: Omit<TaperingEvent, "id" | "createdAt">) => {
      const entry: TaperingEvent = {
        ...input,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      dirty.current = true;
      setTaperingEvents((prev) =>
        [entry, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1))
      );
      return entry;
    },
    []
  );

  const deleteTaperingEvent = useCallback((id: string) => {
    dirty.current = true;
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
