"use client";

import { useState } from "react";
import PosBadge from "@/components/PosBadge";
import { POS_CLASS, POS_LABEL } from "@/lib/partOfSpeech";
import { PARTS_OF_SPEECH, type PartOfSpeech, type WordEntry } from "@/types/word";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function WordCard({
  entry,
  onToggleMemorized,
  onDelete,
  onUpdate,
  onSuggest,
  suggesting,
}: {
  entry: WordEntry;
  onToggleMemorized: (id: string) => void;
  onDelete: (entry: WordEntry) => void;
  onUpdate: (id: string, changes: Partial<WordEntry>) => void;
  onSuggest?: (entry: WordEntry) => void;
  suggesting?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [meaning, setMeaning] = useState(entry.meaning);
  const [pos, setPos] = useState<PartOfSpeech>(entry.partOfSpeech);

  function saveEdit() {
    onUpdate(entry.id, { meaning: meaning.trim() || entry.meaning, partOfSpeech: pos });
    setEditing(false);
  }

  function cancelEdit() {
    setMeaning(entry.meaning);
    setPos(entry.partOfSpeech);
    setEditing(false);
  }

  return (
    <div className={`word-card ${POS_CLASS[entry.partOfSpeech]}`}>
      <div className="word-card-top">
        <span className={`word-title ${entry.memorized ? "memorized" : ""}`}>
          {entry.word}
        </span>
        {entry.isRoot ? (
          <span className="root-badge">起点</span>
        ) : (
          <span className="root-badge">派生語</span>
        )}
      </div>

      {editing ? (
        <>
          <input value={meaning} onChange={(e) => setMeaning(e.target.value)} />
          <select value={pos} onChange={(e) => setPos(e.target.value as PartOfSpeech)}>
            {PARTS_OF_SPEECH.map((p) => (
              <option key={p} value={p}>
                {POS_LABEL[p]}
              </option>
            ))}
          </select>
          <div className="word-card-actions">
            <button className="btn btn-sm" onClick={saveEdit}>
              保存
            </button>
            <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
              キャンセル
            </button>
          </div>
        </>
      ) : (
        <>
          <PosBadge partOfSpeech={entry.partOfSpeech} />
          <p className="word-meaning">{entry.meaning}</p>
          <span className="word-meta">登録日: {formatDate(entry.createdAt)}</span>

          <label className="memorized-toggle">
            <input
              type="checkbox"
              checked={entry.memorized}
              onChange={() => onToggleMemorized(entry.id)}
            />
            {entry.memorized ? "覚えた" : "未定着"}
          </label>

          <div className="word-card-actions">
            {entry.isRoot && onSuggest && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onSuggest(entry)}
                disabled={suggesting}
              >
                {suggesting ? "提案中…" : "🤖 派生語を提案"}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              編集
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(entry)}>
              削除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
