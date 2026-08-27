"use client";

import { useState } from "react";
import { COMPANIES } from "@/lib/data/companies";
import { EVENTS } from "@/lib/data/events";

const TIER_LABEL: Record<number, string> = {
  5: "難易度5・最難関",
  4: "難易度4・難関",
  3: "難易度3・中堅人気",
  2: "難易度2・中間",
  1: "難易度1・積極採用中",
};

export default function CodexScreen({ seenCompanies, seenEvents, onBack }: { seenCompanies: string[]; seenEvents: string[]; onBack: () => void }) {
  const [tab, setTab] = useState<"companies" | "events">("companies");
  const totalEntries = COMPANIES.length + EVENTS.length;
  const gotEntries = seenCompanies.length + seenEvents.filter((id) => EVENTS.some((e) => e.id === id)).length;
  const complete = gotEntries >= totalEntries;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 80px" }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 12 }}>
        ← 戻る
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📖 図鑑</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>
        遭遇した企業・イベントを記録する。全部埋めると「殿堂入りエンジニア」の称号がもらえる（実績にも反映）。
      </p>
      {complete && <div className="tag" style={{ marginBottom: 12, background: "var(--good-soft)", color: "var(--good)" }}>🏛️ 殿堂入りエンジニア達成！</div>}
      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button className="btn" style={{ borderColor: tab === "companies" ? "var(--accent)" : undefined }} onClick={() => setTab("companies")}>
          🏢 企業図鑑（{seenCompanies.length}/{COMPANIES.length}）
        </button>
        <button className="btn" style={{ borderColor: tab === "events" ? "var(--accent)" : undefined }} onClick={() => setTab("events")}>
          🎲 イベント図鑑（{seenEvents.filter((id) => EVENTS.some((e) => e.id === id)).length}/{EVENTS.length}）
        </button>
      </div>

      {tab === "companies" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[5, 4, 3, 2, 1].map((tier) => (
            <div key={tier}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>{TIER_LABEL[tier]}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {COMPANIES.filter((c) => c.tier === tier).map((c) => {
                  const got = seenCompanies.includes(c.id);
                  return (
                    <div key={c.id} className="card" style={{ padding: 10, opacity: got ? 1 : 0.55 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{got ? `${c.emoji} ${c.name}` : "❔ ？？？"}</div>
                      {got && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>{c.flavor}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
          {EVENTS.map((e) => {
            const got = seenEvents.includes(e.id);
            return (
              <div key={e.id} className="card" style={{ padding: 10, opacity: got ? 1 : 0.55 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{got ? `${e.emoji} ${e.title}` : "❔ ？？？"}</div>
                {got && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>{e.description}</div>}
                {e.hidden && got && <span className="tag" style={{ marginTop: 6 }}>レアイベント</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
