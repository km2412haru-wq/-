"use client";

import { useState, type FormEvent } from "react";
import { POS_LABEL } from "@/lib/partOfSpeech";
import { PARTS_OF_SPEECH, type PartOfSpeech } from "@/types/word";

export default function WordForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { word: string; meaning: string; partOfSpeech: PartOfSpeech }) => void;
  submitting: boolean;
}) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>("noun");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) {
      setError("単語と意味を入力してください。");
      return;
    }
    setError(null);
    onSubmit({ word, meaning, partOfSpeech });
    setWord("");
    setMeaning("");
    setPartOfSpeech("noun");
  }

  return (
    <form className="word-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="word-input">単語(英語)</label>
        <input
          id="word-input"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="例: significant"
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="meaning-input">意味(日本語)</label>
        <input
          id="meaning-input"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="例: 重要な、著しい"
        />
      </div>
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
      <button type="submit" className="btn" disabled={submitting}>
        + 登録
      </button>
      {error && <p className="error-text" style={{ gridColumn: "1 / -1" }}>{error}</p>}
    </form>
  );
}
