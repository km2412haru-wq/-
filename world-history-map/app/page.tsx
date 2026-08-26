import { readFile } from "node:fs/promises";
import path from "node:path";
import WorldMap from "@/components/WorldMap";
import type { WorldMapData } from "@/lib/worldMapTypes";

export const metadata = {
  title: "世界史マップ — 国をタップして歴史を知る",
  description: "世界地図から国を選ぶと、その国の歴史をWikipediaから要約表示します",
};

async function loadMapData(): Promise<WorldMapData> {
  const filePath = path.join(process.cwd(), "public", "world-map.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export default async function WorldHistoryPage() {
  const mapData = await loadMapData();

  return (
    <main className="page">
      <div className="header">
        <div>
          <h1 className="title">🗺️ 世界史マップ</h1>
          <p className="subtitle">国をタップすると、その国の歴史をWikipediaから要約表示します</p>
        </div>
      </div>

      <WorldMap mapData={mapData} />

      <footer className="footer">
        歴史情報は日本語版Wikipediaから取得しています。地図データ: Natural Earth（world-atlas）。
      </footer>
    </main>
  );
}
