"use client";

import { useState, type FormEvent } from "react";
import { POS_LABEL } from "@/lib/partOfSpeech";
import { ENTRY_TYPES, PARTS_OF_SPEECH, type EntryType, type PartOfSpeech } from "@/types/word";

const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  word: "単語",
  idiom: "熟語・慣用句",
};

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
          <input
            id="meaning-input"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder={entryType === "idiom" ? "例: 〜を利用する" : "例: 重要な、著しい"}
          />
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
