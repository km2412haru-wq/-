"use client";

import { useEffect, useState, type FormEvent } from "react";
import { POS_LABEL } from "@/lib/partOfSpeech";
import { ENTRY_TYPES, PARTS_OF_SPEECH, type EntryType, type PartOfSpeech } from "@/types/word";

const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  word: "単語",
  idiom: "熟語・慣用句",
};

/** 意味の予測変換を問い合わせるまでの、入力が止まってからの待ち時間(ms) */
const MEANING_SUGGEST_DEBOUNCE_MS = 600;

export default function WordForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: {
    entryType: EntryType;
    word: string;
    meaning: string;
    partOfSpeech: PartOfSpeech;
  }) => void;
  submitting: boolean;
}) {
  const [entryType, setEntryType] = useState<EntryType>("word");
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>("noun");
  const [error, setError] = useState<string | null>(null);
  const [meaningSuggestion, setMeaningSuggestion] = useState("");

  // 単語入力が止まったら、意味を控えめに予測してplaceholderに薄く表示する(意味欄が空のときだけ)
  useEffect(() => {
    setMeaningSuggestion("");

    const trimmedWord = word.trim();
    if (meaning.trim() || trimmedWord.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/suggest-meaning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryType, text: trimmedWord }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && typeof data.meaning === "string" && data.meaning) {
          setMeaningSuggestion(data.meaning);
        }
      } catch {
        // 補助的な機能なので、失敗しても静かに諦める
      }
    }, MEANING_SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [word, entryType, meaning]);

  function acceptMeaningSuggestion() {
    setMeaning(meaningSuggestion);
    setMeaningSuggestion("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) {
      setError(
        entryType === "idiom"
          ? "熟語・慣用句と意味を入力してください。"
          : "単語と意味を入力してください。"
      );
      return;
    }
    setError(null);
    onSubmit({
      entryType,
      word,
      meaning,
      partOfSpeech: entryType === "idiom" ? "other" : partOfSpeech,
    });
    setWord("");
    setMeaning("");
    setPartOfSpeech("noun");
    setMeaningSuggestion("");
  }

  return (
    <>
      <div className="segmented" role="group" aria-label="登録する種類">
        {ENTRY_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={entryType === t}
            onClick={() => setEntryType(t)}
          >
            {ENTRY_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <form className="word-form" onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="word-input">
            {entryType === "idiom" ? "熟語・慣用句(英語)" : "単語(英語)"}
          </label>
          <input
            id="word-input"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder={entryType === "idiom" ? "例: take advantage of" : "例: significant"}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="meaning-input">意味(日本語)</label>
          <div className="input-with-inline-action">
            <input
              id="meaning-input"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder={
                meaningSuggestion ||
                (entryType === "idiom" ? "例: 〜を利用する" : "例: 重要な、著しい")
              }
            />
            {meaningSuggestion && (
              <button
                type="button"
                className="meaning-hint-inline"
                onClick={acceptMeaningSuggestion}
                aria-label={`候補「${meaningSuggestion}」を入力`}
                title={`候補: ${meaningSuggestion}(タップして入力)`}
              >
                💡
              </button>
            )}
          </div>
        </div>
        {entryType === "word" && (
          <div className="field">
            <label htmlFor="pos-input">品詞</label>
            <select
              id="pos-input"
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value as PartOfSpeech)}
            >
              {PARTS_OF_SPEECH.map((pos) => (
                <option key={pos} value={pos}>
                  {POS_LABEL[pos]}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="btn" disabled={submitting}>
          + 登録
        </button>
        {error && <p className="error-text" style={{ gridColumn: "1 / -1" }}>{error}</p>}
      </form>
    </>
  );
}
