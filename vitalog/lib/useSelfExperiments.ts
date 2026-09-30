"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadSelfExperiments, saveSelfExperiments } from "@/lib/storage";
import type { SelfExperiment } from "@/types/vitalog";

/** F12-2: セルフA/Bテストの介入宣言のCRUD */
export function useSelfExperiments() {
  const [selfExperiments, setSelfExperiments] = useState<SelfExperiment[]>([]);
  const [ready, setReady] = useState(false);
  // 変更操作(add/update/delete等)を行ったインスタンスだけが保存する。
  // 読み込んだだけのインスタンスが保存すると、他のインスタンスが直前に保存した最新の内容を
  // 「読み込み時点の古い内容」で上書きして消してしまう(表示専用の利用側が後から
  // マウントされた場合に起きる)ため、変更していないインスタンスは保存しない。
  const dirty = useRef(false);

  useEffect(() => {
    setSelfExperiments(loadSelfExperiments());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    saveSelfExperiments(selfExperiments);
  }, [selfExperiments, ready]);

  const addExperiment = useCallback((description: string, startDate: string) => {
    const entry: SelfExperiment = {
      id: generateId(),
      description,
      startDate,
      createdAt: new Date().toISOString(),
    };
    dirty.current = true;
    setSelfExperiments((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const endExperiment = useCallback((id: string, endDate: string) => {
    dirty.current = true;
    setSelfExperiments((prev) => prev.map((e) => (e.id === id ? { ...e, endDate } : e)));
  }, []);

  const deleteExperiment = useCallback((id: string) => {
    dirty.current = true;
    setSelfExperiments((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { selfExperiments, ready, addExperiment, endExperiment, deleteExperiment };
}
