"use client";

import { useState } from "react";
import PosBadge from "@/components/PosBadge";
import { IDIOM_CLASS, IDIOM_LABEL, POS_CLASS, POS_LABEL } from "@/lib/partOfSpeech";
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
  onGenerateExample,
  generatingExample,
  exampleError,
}: {
  entry: WordEntry;
  onToggleMemorized: (id: string) => void;
  onDelete: (entry: WordEntry) => void;
  onUpdate: (id: string, changes: Partial<WordEntry>) => void;
  onSuggest?: (entry: WordEntry) => void;
  suggesting?: boolean;
  onGenerateExample: (entry: WordEntry) => void;
  generatingExample?: boolean;
  exampleError?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [meaning, setMeaning] = useState(entry.meaning);
  const [pos, setPos] = useState<PartOfSpeech>(entry.partOfSpeech);
  const [exampleEn, setExampleEn] = useState(entry.example?.en ?? "");
  const [exampleJa, setExampleJa] = useState(entry.example?.ja ?? "");

  const isIdiom = entry.entryType === "idiom";
  const cardClass = isIdiom ? IDIOM_CLASS : POS_CLASS[entry.partOfSpeech];

  function saveEdit() {
    onUpdate(entry.id, {
      meaning: meaning.trim() || entry.meaning,
      partOfSpeech: isIdiom ? entry.partOfSpeech : pos,
      example:
        exampleEn.trim() && exampleJa.trim()
          ? { en: exampleEn.trim(), ja: exampleJa.trim() }
          : undefined,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setMeaning(entry.meaning);
    setPos(entry.partOfSpeech);
    setExampleEn(entry.example?.en ?? "");
    setExampleJa(entry.example?.ja ?? "");
    setEditing(false);
  }

  return (
    <div className={`word-card ${cardClass}`}>
      <div className="word-card-top">
        <span className={`word-title ${entry.memorized ? "memorized" : ""}`}>
          {entry.word}
        </span>
        {!isIdiom && (
          <span className="root-badge">{entry.isRoot ? "起点" : "派生語"}</span>
        )}
      </div>

      {editing ? (
        <>
          <input value={meaning} onChange={(e) => setMeaning(e.target.value)} />
          {!isIdiom && (
            <select value={pos} onChange={(e) => setPos(e.target.value as PartOfSpeech)}>
              {PARTS_OF_SPEECH.map((p) => (
                <option key={p} value={p}>
                  {POS_LABEL[p]}
                </option>
              ))}
            </select>
          )}
          <label className="field" style={{ marginTop: 4 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>例文(英語)</span>
            <input value={exampleEn} onChange={(e) => setExampleEn(e.target.value)} />
          </label>
          <label className="field">
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>例文の日本語訳</span>
            <input value={exampleJa} onChange={(e) => setExampleJa(e.target.value)} />
          </label>
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
          {isIdiom ? (
            <span className={`pos-badge ${IDIOM_CLASS}`}>{IDIOM_LABEL}</span>
          ) : (
            <PosBadge partOfSpeech={entry.partOfSpeech} />
          )}
          <p className="word-meaning">{entry.meaning}</p>

          {entry.example && (
            <div className="example-block">
              <p className="example-en">📝 {entry.example.en}</p>
              <p className="example-ja">{entry.example.ja}</p>
            </div>
          )}
          {exampleError && <p className="error-text">{exampleError}</p>}

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
            {!isIdiom && entry.isRoot && onSuggest && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onSuggest(entry)}
                disabled={suggesting}
              >
                {suggesting ? "提案中…" : "🤖 派生語を提案"}
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onGenerateExample(entry)}
              disabled={generatingExample}
            >
              {generatingExample ? "生成中…" : entry.example ? "🔄 例文を再生成" : "📝 例文を生成"}
            </button>
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
