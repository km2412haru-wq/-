import type { WordEntry } from "@/types/word";

const STORAGE_KEY = "toeic-vocab-tracker:words:v1";

/**
 * 単語データをlocalStorageから読み込む。
 * SSR時(windowが無い)や壊れたデータの場合は空配列を返す。
 */
export function loadWords(): WordEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WordEntry[];
  } catch (err) {
    console.error("単語データの読み込みに失敗しました:", err);
    return [];
  }
}

/**
 * 単語データをlocalStorageに保存する。
 * 保存に失敗しても(容量超過など)アプリ自体は動作を続けられるようログのみ出す。
 */
export function saveWords(words: WordEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (err) {
    console.error("単語データの保存に失敗しました:", err);
  }
}
