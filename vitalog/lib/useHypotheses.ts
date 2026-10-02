"use client";

import { useCallback } from "react";
import { generateId } from "@/lib/id";
import { updateStore } from "@/lib/storage";
import { patchById, removeById, upsertById } from "@/lib/storeOps";
import { useStoreSelect } from "@/lib/useStoreSelect";
import type { Hypothesis, VitalogStore } from "@/types/vitalog";

const EMPTY: Hypothesis[] = [];

function selectHypotheses(store: VitalogStore): Hypothesis[] {
  return store.hypotheses;
}

/** F12-1: 仮説検証フレームワーク(登録・一覧のみ。保存の方式はuseDailyLogsと同じ) */
export function useHypotheses() {
  const { value: hypotheses, ready } = useStoreSelect(selectHypotheses, EMPTY);

  const addHypothesis = useCallback((statement: string): Hypothesis | null => {
    const entry: Hypothesis = {
      id: generateId(),
      statement,
      createdAt: new Date().toISOString(),
    };
    const ok = updateStore((store) => ({ ...store, hypotheses: upsertById(store.hypotheses, entry) }));
    return ok ? entry : null;
  }, []);

  const updateHypothesisNote = useCallback((id: string, note: string): boolean => {
    return updateStore((store) => ({
      ...store,
      hypotheses: patchById(store.hypotheses, id, (h) => ({ ...h, note })),
    }));
  }, []);

  const deleteHypothesis = useCallback((id: string): boolean => {
    return updateStore((store) => ({ ...store, hypotheses: removeById(store.hypotheses, id) }));
  }, []);

  return { hypotheses, ready, addHypothesis, updateHypothesisNote, deleteHypothesis };
}
