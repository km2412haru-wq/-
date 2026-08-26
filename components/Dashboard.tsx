"use client";

import { useMemo, useState } from "react";
import NewsCard from "./NewsCard";
import { CATEGORY_LABELS } from "@/lib/categorize";
import type { Category, FetchResult } from "@/lib/types";

const TABS: { key: Category | "all"; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "ma", label: CATEGORY_LABELS.ma },
  { key: "business", label: CATEGORY_LABELS.business },
  { key: "profit", label: CATEGORY_LABELS.profit },
  { key: "other", label: CATEGORY_LABELS.other },
];

export default function Dashboard({ initialData }: { initialData: FetchResult }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/news?refresh=1", { cache: "no-store" });
      const fresh: FetchResult = await res.json();
      setData(fresh);
    } catch {
      // Keep showing the previous data; the error banner below covers
      // per-source failures, this is just a best-effort refresh.
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.items.filter((item) => {
      const matchesTab = activeTab === "all" || item.categories.includes(activeTab);
      if (!matchesTab) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    });
  }, [data.items, activeTab, query]);

  const fetchedAtLabel = new Date(data.fetchedAt).toLocaleString("ja-JP");

  return (
    <>
      <div className="header">
        <div>
          <h1 className="title">AI M&amp;A Radar</h1>
          <p className="subtitle">
            AI関連企業のM&amp;A・ビジネスモデル・業績動向をRSSから自動収集
          </p>
        </div>
        <button
          className="refreshBtn"
          onClick={handleRefresh}
          disabled={loading}
          type="button"
        >
          {loading ? "更新中…" : "🔄 最新情報に更新"}
        </button>
      </div>

      <div className="controls">
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className="tab"
              data-active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className="searchInput"
          type="search"
          placeholder="企業名・キーワードで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="meta">
        {filtered.length}件表示 / 全{data.items.length}件・最終取得: {fetchedAtLabel}
      </p>

      {data.errors.length > 0 && (
        <div className="errorBanner">
          取得できなかったソース: {data.errors.map((e) => e.source).join("、")}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">該当するニュースが見つかりませんでした。</div>
      ) : (
        <div className="list">
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <footer className="footer">
        M&amp;A / ビジネスモデル / 利益・業績 のタグはキーワードマッチによる自動分類です。
        情報源: {Array.from(new Set(data.items.map((i) => i.source))).join("、") || "—"}
      </footer>
    </>
  );
}
