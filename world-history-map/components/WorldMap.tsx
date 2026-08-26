"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CountryShape, WorldMapData } from "@/lib/worldMapTypes";

export default function WorldMap({ mapData }: { mapData: WorldMapData }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function goToCountry(shape: CountryShape) {
    router.push(`/country/${encodeURIComponent(shape.nameJa)}`);
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
                <button type="button" onClick={() => goToCountry(s)}>
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
          aria-label="世界地図。国をタップすると、その国の時代別の歴史ページが開きます。"
        >
          {mapData.shapes.map((shape) => (
            <path
              key={shape.id}
              d={shape.d}
              className="wmCountry"
              onClick={() => goToCountry(shape)}
            >
              <title>{shape.nameJa}</title>
            </path>
          ))}
        </svg>
      </div>

      <p className="wmHint">地図の国をタップ、または上の検索欄から国名を選ぶと、時代別の歴史ページが開きます。</p>
    </>
  );
}
