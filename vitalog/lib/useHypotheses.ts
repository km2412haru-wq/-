"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadHypotheses, saveHypotheses } from "@/lib/storage";
import type { Hypothesis } from "@/types/vitalog";

/** F12-1: 仮説検証フレームワーク(登録・一覧のみ。支持率算出はF5/F11実装後) */
export function useHypotheses() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [ready, setReady] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setHypotheses(loadHypotheses());
    setReady(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!ready) return;
    saveHypotheses(hypotheses);
  }, [hypotheses, ready]);

  const addHypothesis = useCallback((statement: string) => {
    const entry: Hypothesis = {
      id: generateId(),
      statement,
      createdAt: new Date().toISOString(),
    };
    setHypotheses((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateHypothesisNote = useCallback((id: string, note: string) => {
    setHypotheses((prev) => prev.map((h) => (h.id === id ? { ...h, note } : h)));
  }, []);

  const deleteHypothesis = useCallback((id: string) => {
    setHypotheses((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { hypotheses, ready, addHypothesis, updateHypothesisNote, deleteHypothesis };
}
