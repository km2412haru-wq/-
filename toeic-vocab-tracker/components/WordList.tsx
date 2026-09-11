"use client";

import WordCard from "@/components/WordCard";
import type { WordEntry } from "@/types/word";

interface FieldErrorState {
  id: string;
  message: string;
}

export default function WordList({
  words,
  onToggleMemorized,
  onDelete,
  onUpdate,
  onSuggest,
  suggestingGroupId,
  onGenerateExample,
  generatingExampleId,
  exampleError,
  generatingPhoneticId,
  phoneticError,
  onGenerateUsageNote,
  generatingUsageNoteId,
  usageNoteError,
}: {
  words: WordEntry[];
  onToggleMemorized: (id: string) => void;
  onDelete: (entry: WordEntry) => void;
  onUpdate: (id: string, changes: Partial<WordEntry>) => void;
  onSuggest: (entry: WordEntry) => void;
  suggestingGroupId: string | null;
  onGenerateExample: (entry: WordEntry) => void;
  generatingExampleId: string | null;
  exampleError: FieldErrorState | null;
  generatingPhoneticId: string | null;
  phoneticError: FieldErrorState | null;
  onGenerateUsageNote: (entry: WordEntry) => void;
  generatingUsageNoteId: string | null;
  usageNoteError: FieldErrorState | null;
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
          onGenerateExample={onGenerateExample}
          generatingExample={generatingExampleId === entry.id}
          exampleError={exampleError?.id === entry.id ? exampleError.message : null}
          generatingPhonetic={generatingPhoneticId === entry.id}
          phoneticError={phoneticError?.id === entry.id ? phoneticError.message : null}
          onGenerateUsageNote={onGenerateUsageNote}
          generatingUsageNote={generatingUsageNoteId === entry.id}
          usageNoteError={usageNoteError?.id === entry.id ? usageNoteError.message : null}
        />
      ))}
    </div>
  );
}
