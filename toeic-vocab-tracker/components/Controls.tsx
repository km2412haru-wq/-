"use client";

import type { MemorizedFilter, SortKey, ViewMode } from "@/types/word";

export default function Controls({
  search,
  onSearchChange,
  sortKey,
  onSortChange,
  memorizedFilter,
  onMemorizedFilterChange,
  viewMode,
  onViewModeChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sortKey: SortKey;
  onSortChange: (v: SortKey) => void;
  memorizedFilter: MemorizedFilter;
  onMemorizedFilterChange: (v: MemorizedFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}) {
  return (
    <div className="controls">
      <input
        type="search"
        placeholder="単語で検索…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="単語で検索"
      />

      <select
        value={sortKey}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        aria-label="並び替え"
      >
        <option value="createdAtDesc">登録日(新しい順)</option>
        <option value="createdAtAsc">登録日(古い順)</option>
        <option value="alphabetical">アルファベット順</option>
      </select>

      <select
        value={memorizedFilter}
        onChange={(e) => onMemorizedFilterChange(e.target.value as MemorizedFilter)}
        aria-label="覚えた/未定着で絞り込み"
      >
        <option value="all">すべて</option>
        <option value="memorized">覚えた</option>
        <option value="unmemorized">未定着</option>
      </select>

      <div className="segmented" role="group" aria-label="表示切り替え">
        <button
          type="button"
          aria-pressed={viewMode === "list"}
          onClick={() => onViewModeChange("list")}
        >
          一覧
        </button>
        <button
          type="button"
          aria-pressed={viewMode === "group"}
          onClick={() => onViewModeChange("group")}
        >
          グループ
        </button>
      </div>
    </div>
  );
}
