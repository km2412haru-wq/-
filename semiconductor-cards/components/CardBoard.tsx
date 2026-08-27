"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CompanyCard from "./CompanyCard";
import BattleModal from "./BattleModal";
import { COMPANIES } from "@/lib/companies";
import { filterCompanies, sortCompanies, type SortKey } from "@/lib/filter";
import { SEGMENT_ICONS, SEGMENT_LABELS, SEGMENT_ORDER } from "@/lib/segments";
import type { Region, Segment } from "@/lib/types";

const REGION_TABS: { key: Region | "all"; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "global", label: "海外" },
  { key: "japan", label: "🇯🇵 日本" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "revenue", label: "売上高が大きい順" },
  { key: "margin", label: "利益率が高い順" },
  { key: "name", label: "五十音順" },
];

export default function CardBoard() {
  const [segment, setSegment] = useState<Segment | "all">("all");
  const [region, setRegion] = useState<Region | "all">("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");

  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBattle, setShowBattle] = useState(false);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [justJumpedId, setJustJumpedId] = useState<string | null>(null);

  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const lookup = useMemo(() => new Map(COMPANIES.map((c) => [c.id, c])), []);

  const filtered = useMemo(
    () => sortCompanies(filterCompanies(COMPANIES, { segment, region, query }), sortKey),
    [segment, region, query, sortKey]
  );

  useEffect(() => {
    if (!pendingScrollId) return;
    const el = cardRefs.current.get(pendingScrollId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setJustJumpedId(pendingScrollId);
      const t = setTimeout(() => setJustJumpedId(null), 1500);
      setPendingScrollId(null);
      return () => clearTimeout(t);
    }
  }, [filtered, pendingScrollId]);

  function toggleFlip(id: string) {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id];
    });
  }

  function jumpToRival(id: string) {
    // 競合カードがフィルターで隠れていても確実に見えるようリセットする。
    setSegment("all");
    setRegion("all");
    setQuery("");
    setFlippedIds((prev) => new Set(prev).add(id));
    setPendingScrollId(id);
  }

  const selectedCompanies = selectedIds.map((id) => lookup.get(id)!).filter(Boolean);

  return (
    <div className="board">
      <header className="hero">
        <h1>🔬 半導体トレカ図鑑</h1>
        <p className="heroLead">
          TSMCやNVIDIA、東京エレクトロンなど半導体業界の主要企業を、トレーディングカード感覚でめくって見比べられる図鑑です。
        </p>
        <ol className="heroHowTo">
          <li>カードをタップ／クリックすると裏返って、ビジネスモデルや強みが見られます。</li>
          <li>裏面の「競合」チップを押すと、そのライバル企業のカードにジャンプします。</li>
          <li>⚔️ を2枚のカードで押すと「対戦」できます（総合力スコアの遊びです）。</li>
        </ol>
      </header>

      <div className="controls">
        <input
          className="searchInput"
          type="search"
          placeholder="企業名・国・キーワードで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="企業を検索"
        />

        <div className="chipRow" role="group" aria-label="事業タイプで絞り込み">
          <button
            type="button"
            className="chip"
            data-active={segment === "all"}
            onClick={() => setSegment("all")}
          >
            すべての業態
          </button>
          {SEGMENT_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              data-active={segment === s}
              onClick={() => setSegment(s === segment ? "all" : s)}
              title={SEGMENT_LABELS[s]}
            >
              {SEGMENT_ICONS[s]} {SEGMENT_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="controlsRow">
          <div className="chipRow" role="group" aria-label="地域で絞り込み">
            {REGION_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className="chip"
                data-active={region === t.key}
                onClick={() => setRegion(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select
            className="sortSelect"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="並び替え"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="resultCount">{filtered.length}社を表示中</p>

      <div className="cardGrid">
        {filtered.map((company) => (
          <div key={company.id} className={justJumpedId === company.id ? "jumpHighlight" : undefined}>
            <CompanyCard
              company={company}
              flipped={flippedIds.has(company.id)}
              selected={selectedIds.includes(company.id)}
              onToggleFlip={() => toggleFlip(company.id)}
              onToggleSelect={() => toggleSelect(company.id)}
              onRivalClick={jumpToRival}
              lookup={lookup}
              cardRef={(el) => {
                if (el) cardRefs.current.set(company.id, el);
                else cardRefs.current.delete(company.id);
              }}
            />
          </div>
        ))}
        {filtered.length === 0 && <p className="emptyState">条件に一致する企業がありませんでした。</p>}
      </div>

      {selectedIds.length > 0 && (
        <div className="battleBar">
          <span className="battleBarLabel">
            対戦候補：{selectedCompanies.map((c) => c.nameJa).join(" ・ ")}
            {selectedIds.length < 2 && "（あと1枚選んでね）"}
          </span>
          <div className="battleBarActions">
            {selectedIds.length === 2 && (
              <button type="button" className="battleGoButton" onClick={() => setShowBattle(true)}>
                ⚔️ 対戦する
              </button>
            )}
            <button type="button" className="battleClearButton" onClick={() => setSelectedIds([])}>
              選択解除
            </button>
          </div>
        </div>
      )}

      {showBattle && selectedCompanies.length === 2 && (
        <BattleModal a={selectedCompanies[0]} b={selectedCompanies[1]} onClose={() => setShowBattle(false)} />
      )}

      <footer className="footerNote">
        <p>
          ※ 掲載している売上高・営業利益率は各社IR資料等をもとにした規模感の目安であり、年度・為替・会計基準により変動します。最新の正確な数値は各社の公式発表をご確認ください。
        </p>
      </footer>
    </div>
  );
}
