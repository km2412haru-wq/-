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
  MemorizedFilter,
  PartOfSpeech,
  SortKey,
  ViewMode,
  WordEntry,
} from "@/types/word";

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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [registering, setRegistering] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);

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

    const sorted = [...list];
    if (sortKey === "createdAtAsc") {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (sortKey === "alphabetical") {
      sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
  }, [words, search, memorizedFilter, sortKey]);

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

  function handleRegister(input: { word: string; meaning: string; partOfSpeech: PartOfSpeech }) {
    setRegistering(true);
    const entry = addRootWord(input);
    setRegistering(false);
    void fetchSuggestions(entry);
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
          <h1>📓 知らない単語記録アプリ</h1>
          <p>TOEIC学習用。単語を登録するとAI(Claude)が派生語を提案します。</p>
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
        />
      ) : (
        <GroupList words={filteredWords} onToggleMemorized={toggleMemorized} />
      )}
    </main>
  );
}
