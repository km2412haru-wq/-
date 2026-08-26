"use client";

import { useMemo, useState } from "react";
import type { CountryShape, WorldMapData } from "@/lib/worldMapTypes";
import type { CountryHistory } from "@/lib/wikipedia";

type HistoryState = CountryHistory | "loading" | "error" | null;

export default function WorldMap({ mapData }: { mapData: WorldMapData }) {
  const [selected, setSelected] = useState<CountryShape | null>(null);
  const [history, setHistory] = useState<HistoryState>(null);
  const [query, setQuery] = useState("");

  async function selectCountry(shape: CountryShape) {
    setSelected(shape);
    setQuery("");
    setHistory("loading");
    try {
      const res = await fetch(`/api/history?name=${encodeURIComponent(shape.nameJa)}`);
      if (!res.ok) throw new Error("not found");
      const data: CountryHistory = await res.json();
      setHistory(data);
    } catch {
      setHistory("error");
    }
  }

  function closePanel() {
    setSelected(null);
    setHistory(null);
  }

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return mapData.shapes
      .filter((s) => s.nameJa.includes(query.trim()) || s.nameEn.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, mapData.shapes]);

  return (
    <>
      <div className="wmSearchRow">
        <input
          className="searchInput"
          type="search"
          placeholder="国名で検索（例: フランス）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className="wmSuggestions">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => selectCountry(s)}>
                  {s.nameJa}
                  <span className="wmSuggestionEn">{s.nameEn}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="wmMapContainer">
        <svg
          viewBox={`0 0 ${mapData.width} ${mapData.height}`}
          className="wmSvg"
          role="img"
          aria-label="世界地図。国をタップすると歴史が表示されます。"
        >
          {mapData.shapes.map((shape) => (
            <path
              key={shape.id}
              d={shape.d}
              className="wmCountry"
              data-selected={selected?.id === shape.id}
              onClick={() => selectCountry(shape)}
            >
              <title>{shape.nameJa}</title>
            </path>
          ))}
        </svg>
      </div>

      <p className="wmHint">地図の国をタップ、または上の検索欄から国名を選んでください。</p>

      {selected && (
        <>
          <div className="wmOverlay" onClick={closePanel} />
          <div className="wmPanel" role="dialog" aria-label={`${selected.nameJa}の歴史`}>
            <div className="wmPanelHeader">
              <h2 className="wmPanelTitle">{selected.nameJa}</h2>
              <button className="wmCloseBtn" onClick={closePanel} type="button" aria-label="閉じる">
                ✕
              </button>
            </div>

            {history === "loading" && <p className="wmPanelStatus">読み込み中…</p>}
            {history === "error" && (
              <p className="wmPanelStatus">情報を取得できませんでした。時間をおいて試してください。</p>
            )}
            {history && typeof history === "object" && (
              <>
                {!history.isHistorySpecific && (
                  <p className="wmPanelNote">
                    「{selected.nameJa}の歴史」の専門記事が見つからなかったため、国の概要記事を表示しています。
                  </p>
                )}
                <p className="wmExtract">{history.extract}</p>
                <a
                  className="wmReadMore"
                  href={history.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wikipediaで続きを読む →
                </a>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
