"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadVisits, saveVisits } from "@/lib/storage";
import type { Visit } from "@/types/vitalog";

/** 通院記録のCRUD */
export function useVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [ready, setReady] = useState(false);
  // 変更操作(add/update/delete等)を行ったインスタンスだけが保存する。
  // 読み込んだだけのインスタンスが保存すると、他のインスタンスが直前に保存した最新の内容を
  // 「読み込み時点の古い内容」で上書きして消してしまう(表示専用の利用側が後から
  // マウントされた場合に起きる)ため、変更していないインスタンスは保存しない。
  const dirty = useRef(false);

  useEffect(() => {
    setVisits(loadVisits());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    saveVisits(visits);
  }, [visits, ready]);

  const addVisit = useCallback(
    (input: Omit<Visit, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const entry: Visit = { ...input, id: generateId(), createdAt: now, updatedAt: now };
      dirty.current = true;
      setVisits((prev) =>
        [entry, ...prev].sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1))
      );
      return entry;
    },
    []
  );

  const deleteVisit = useCallback((id: string) => {
    dirty.current = true;
    setVisits((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { visits, ready, addVisit, deleteVisit };
}
