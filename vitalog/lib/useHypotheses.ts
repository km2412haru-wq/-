"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadHypotheses, saveHypotheses } from "@/lib/storage";
import type { Hypothesis } from "@/types/vitalog";

/** F12-1: 仮説検証フレームワーク(登録・一覧のみ。支持率算出はF5/F11実装後) */
export function useHypotheses() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [ready, setReady] = useState(false);
  // 変更操作(add/update/delete等)を行ったインスタンスだけが保存する。
  // 読み込んだだけのインスタンスが保存すると、他のインスタンスが直前に保存した最新の内容を
  // 「読み込み時点の古い内容」で上書きして消してしまう(表示専用の利用側が後から
  // マウントされた場合に起きる)ため、変更していないインスタンスは保存しない。
  const dirty = useRef(false);

  useEffect(() => {
    setHypotheses(loadHypotheses());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    saveHypotheses(hypotheses);
  }, [hypotheses, ready]);

  const addHypothesis = useCallback((statement: string) => {
    const entry: Hypothesis = {
      id: generateId(),
      statement,
      createdAt: new Date().toISOString(),
    };
    dirty.current = true;
    setHypotheses((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateHypothesisNote = useCallback((id: string, note: string) => {
    dirty.current = true;
    setHypotheses((prev) => prev.map((h) => (h.id === id ? { ...h, note } : h)));
  }, []);

  const deleteHypothesis = useCallback((id: string) => {
    dirty.current = true;
    setHypotheses((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { hypotheses, ready, addHypothesis, updateHypothesisNote, deleteHypothesis };
}
