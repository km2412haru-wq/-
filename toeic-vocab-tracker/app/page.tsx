"use client";

import { useMemo, useState } from "react";
import Controls from "@/components/Controls";
import GroupList from "@/components/GroupList";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import WordForm from "@/components/WordForm";
import WordList from "@/components/WordList";
import { useWords } from "@/lib/useWords";
import type {
  DerivativeSuggestion,
  EditableSuggestion,
  EntryType,
  EntryTypeFilter,
  MemorizedFilter,
  PartOfSpeech,
  SortKey,
  ViewMode,
  WordEntry,
} from "@/types/word";

interface FieldErrorState {
  id: string;
  message: string;
}

interface SuggestionState {
  entry: WordEntry;
  loading: boolean;
  error: string | null;
  items: EditableSuggestion[];
}

export default function Home() {
  const { words, ready, addRootWord, addDerivative, updateWord, toggleMemorized, deleteWord, deleteGroup } =
    useWords();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAtDesc");
  const [memorizedFilter, setMemorizedFilter] = useState<MemorizedFilter>("all");
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryTypeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [registering, setRegistering] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);
  const [exampleLoadingId, setExampleLoadingId] = useState<string | null>(null);
  const [exampleError, setExampleError] = useState<FieldErrorState | null>(null);
  const [phoneticLoadingId, setPhoneticLoadingId] = useState<string | null>(null);
  const [phoneticError, setPhoneticError] = useState<FieldErrorState | null>(null);
  const [usageNoteLoadingId, setUsageNoteLoadingId] = useState<string | null>(null);
  const [usageNoteError, setUsageNoteError] = useState<FieldErrorState | null>(null);

  const filteredWords = useMemo(() => {
    let list = words;

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => w.word.toLowerCase().includes(q));
    }
    if (memorizedFilter === "memorized") {
      list = list.filter((w) => w.memorized);
    } else if (memorizedFilter === "unmemorized") {
      list = list.filter((w) => !w.memorized);
    }
    if (entryTypeFilter !== "all") {
      list = list.filter((w) => w.entryType === entryTypeFilter);
    }

    const sorted = [...list];
    if (sortKey === "createdAtAsc") {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (sortKey === "alphabetical") {
      sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
  }, [words, search, memorizedFilter, entryTypeFilter, sortKey]);

  async function fetchSuggestions(entry: WordEntry) {
    setSuggestion({ entry, loading: true, error: null, items: [] });

    const existingWords = words.filter((w) => w.groupId === entry.groupId).map((w) => w.word);

    try {
      const res = await fetch("/api/suggest-derivatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: entry.word,
          meaning: entry.meaning,
          partOfSpeech: entry.partOfSpeech,
          existingWords,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "派生語の提案に失敗しました。");
      }

      const items: EditableSuggestion[] = (data.derivatives as DerivativeSuggestion[]).map(
        (d, i) => ({
          ...d,
          key: `${entry.id}-${i}-${d.word}`,
          status: "pending" as const,
        })
      );
      setSuggestion({ entry, loading: false, error: null, items });
    } catch (err) {
      setSuggestion({
        entry,
        loading: false,
        error: err instanceof Error ? err.message : "不明なエラーが発生しました。",
        items: [],
      });
    }
  }

  function handleRegister(input: {
    entryType: EntryType;
    word: string;
    meaning: string;
    partOfSpeech: PartOfSpeech;
  }) {
    setRegistering(true);
    const entry = addRootWord(input);
    setRegistering(false);
    // 派生語の概念があるのは通常の単語のみ。熟語・慣用句では自動提案しない
    if (entry.entryType === "word") {
      void fetchSuggestions(entry);
    }
    // アクセント(発音記号)は単語・熟語どちらも登録時に自動生成する
    void handleGeneratePhonetic(entry);
  }

  async function handleGenerateExample(entry: WordEntry) {
    setExampleLoadingId(entry.id);
    setExampleError(null);

    try {
      const res = await fetch("/api/generate-example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: entry.entryType,
          text: entry.word,
          meaning: entry.meaning,
          partOfSpeech: entry.partOfSpeech,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "例文の生成に失敗しました。");
      }
      updateWord(entry.id, { example: data.example });
    } catch (err) {
      setExampleError({
        id: entry.id,
        message: err instanceof Error ? err.message : "不明なエラーが発生しました。",
      });
    } finally {
      setExampleLoadingId(null);
    }
  }

  async function handleGeneratePhonetic(entry: WordEntry) {
    setPhoneticLoadingId(entry.id);
    setPhoneticError(null);

    try {
      const res = await fetch("/api/generate-phonetic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryType: entry.entryType, text: entry.word }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "発音記号の生成に失敗しました。");
      }
      updateWord(entry.id, { phonetic: data.phonetic });
    } catch (err) {
      setPhoneticError({
        id: entry.id,
        message: err instanceof Error ? err.message : "不明なエラーが発生しました。",
      });
    } finally {
      setPhoneticLoadingId(null);
    }
  }

  async function handleGenerateUsageNote(entry: WordEntry) {
    setUsageNoteLoadingId(entry.id);
    setUsageNoteError(null);

    try {
      const res = await fetch("/api/generate-usage-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: entry.word,
          meaning: entry.meaning,
          partOfSpeech: entry.partOfSpeech,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "語法メモの生成に失敗しました。");
      }
      updateWord(entry.id, { usageNote: data.note });
    } catch (err) {
      setUsageNoteError({
        id: entry.id,
        message: err instanceof Error ? err.message : "不明なエラーが発生しました。",
      });
    } finally {
      setUsageNoteLoadingId(null);
    }
  }

  function handleAcceptSuggestion(key: string) {
    if (!suggestion) return;
    const item = suggestion.items.find((s) => s.key === key);
    if (!item) return;
    addDerivative(suggestion.entry.groupId, item);
    setSuggestion({
      ...suggestion,
      items: suggestion.items.map((s) => (s.key === key ? { ...s, status: "accepted" } : s)),
    });
  }

  function handleRejectSuggestion(key: string) {
    if (!suggestion) return;
    setSuggestion({
      ...suggestion,
      items: suggestion.items.map((s) => (s.key === key ? { ...s, status: "rejected" } : s)),
    });
  }

  function handleEditSuggestion(key: string, changes: Partial<EditableSuggestion>) {
    if (!suggestion) return;
    setSuggestion({
      ...suggestion,
      items: suggestion.items.map((s) => (s.key === key ? { ...s, ...changes } : s)),
    });
  }

  function handleDelete(entry: WordEntry) {
    if (entry.isRoot) {
      const hasDerivatives = words.some((w) => w.groupId === entry.groupId && w.id !== entry.id);
      const message = hasDerivatives
        ? `「${entry.word}」を削除すると、登録済みの派生語もすべて削除されます。よろしいですか?`
        : `「${entry.word}」を削除しますか?`;
      if (!window.confirm(message)) return;
      deleteGroup(entry.groupId);
      if (suggestion?.entry.groupId === entry.groupId) setSuggestion(null);
    } else {
      if (!window.confirm(`「${entry.word}」を削除しますか?`)) return;
      deleteWord(entry.id);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>知らない単語記録アプリ</h1>
          <p>TOEIC学習用。単語・熟語を登録するとAI(Claude)が派生語や例文を提案します。</p>
        </div>
        <span className="word-count">{words.length}語 登録済み</span>
      </div>

      <div className="panel">
        <p className="panel-title">単語を登録</p>
        <WordForm onSubmit={handleRegister} submitting={registering} />
      </div>

      {suggestion && (
        <SuggestionsPanel
          rootWord={suggestion.entry.word}
          loading={suggestion.loading}
          error={suggestion.error}
          suggestions={suggestion.items}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
          onEdit={handleEditSuggestion}
          onRetry={() => fetchSuggestions(suggestion.entry)}
          onClose={() => setSuggestion(null)}
        />
      )}

      <Controls
        search={search}
        onSearchChange={setSearch}
        sortKey={sortKey}
        onSortChange={setSortKey}
        memorizedFilter={memorizedFilter}
        onMemorizedFilterChange={setMemorizedFilter}
        entryTypeFilter={entryTypeFilter}
        onEntryTypeFilterChange={setEntryTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {!ready ? (
        <p className="empty-state">読み込み中…</p>
      ) : viewMode === "list" ? (
        <WordList
          words={filteredWords}
          onToggleMemorized={toggleMemorized}
          onDelete={handleDelete}
          onUpdate={updateWord}
          onSuggest={fetchSuggestions}
          suggestingGroupId={suggestion?.loading ? suggestion.entry.groupId : null}
          onGenerateExample={handleGenerateExample}
          generatingExampleId={exampleLoadingId}
          exampleError={exampleError}
          generatingPhoneticId={phoneticLoadingId}
          phoneticError={phoneticError}
          onGenerateUsageNote={handleGenerateUsageNote}
          generatingUsageNoteId={usageNoteLoadingId}
          usageNoteError={usageNoteError}
        />
      ) : (
        <GroupList words={filteredWords} onToggleMemorized={toggleMemorized} />
      )}
    </main>
  );
}
