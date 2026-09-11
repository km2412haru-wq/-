"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { loadWords, saveWords } from "@/lib/storage";
import type { DerivativeSuggestion, PartOfSpeech, WordEntry } from "@/types/word";

/**
 * 単語データのCRUDとlocalStorageへの永続化を担うフック。
 * マウント後にlocalStorageから読み込むため、SSRとのハイドレーション不一致を避けられる。
 */
export function useWords() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [ready, setReady] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setWords(loadWords());
    setReady(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      // 初回ロード直後の空配列での上書き保存を防ぐ
      isFirstLoad.current = false;
      return;
    }
    if (!ready) return;
    saveWords(words);
  }, [words, ready]);

  /** 新しい単語(グループの起点)を登録する。作成したエントリを返す */
  const addRootWord = useCallback(
    (input: { word: string; meaning: string; partOfSpeech: PartOfSpeech }): WordEntry => {
      const id = generateId();
      const entry: WordEntry = {
        id,
        word: input.word.trim(),
        meaning: input.meaning.trim(),
        partOfSpeech: input.partOfSpeech,
        memorized: false,
        createdAt: new Date().toISOString(),
        groupId: id,
        isRoot: true,
      };
      setWords((prev) => [entry, ...prev]);
      return entry;
    },
    []
  );

  /** AIが提案した派生語を、ユーザーの確定操作で登録する */
  const addDerivative = useCallback(
    (groupId: string, suggestion: DerivativeSuggestion): WordEntry => {
      const entry: WordEntry = {
        id: generateId(),
        word: suggestion.word.trim(),
        meaning: suggestion.meaning.trim(),
        partOfSpeech: suggestion.partOfSpeech,
        memorized: false,
        createdAt: new Date().toISOString(),
        groupId,
        isRoot: false,
      };
      setWords((prev) => [...prev, entry]);
      return entry;
    },
    []
  );

  const updateWord = useCallback((id: string, changes: Partial<WordEntry>) => {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...changes } : w)));
  }, []);

  const toggleMemorized = useCallback((id: string) => {
    setWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, memorized: !w.memorized } : w))
    );
  }, []);

  const deleteWord = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  /** 起点の単語を削除する際、同じグループの派生語もまとめて削除する */
  const deleteGroup = useCallback((groupId: string) => {
    setWords((prev) => prev.filter((w) => w.groupId !== groupId));
  }, []);

  return {
    words,
    ready,
    addRootWord,
    addDerivative,
    updateWord,
    toggleMemorized,
    deleteWord,
    deleteGroup,
  };
}
