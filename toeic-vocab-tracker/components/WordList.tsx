"use client";

import WordCard from "@/components/WordCard";
import type { WordEntry } from "@/types/word";

export default function WordList({
  words,
  onToggleMemorized,
  onDelete,
  onUpdate,
  onSuggest,
  suggestingGroupId,
}: {
  words: WordEntry[];
  onToggleMemorized: (id: string) => void;
  onDelete: (entry: WordEntry) => void;
  onUpdate: (id: string, changes: Partial<WordEntry>) => void;
  onSuggest: (entry: WordEntry) => void;
  suggestingGroupId: string | null;
}) {
  if (words.length === 0) {
    return <p className="empty-state">登録した単語がまだありません。上のフォームから追加してみましょう。</p>;
  }

  return (
    <div className="word-grid">
      {words.map((entry) => (
        <WordCard
          key={entry.id}
          entry={entry}
          onToggleMemorized={onToggleMemorized}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onSuggest={onSuggest}
          suggesting={suggestingGroupId === entry.groupId}
        />
      ))}
    </div>
  );
}
