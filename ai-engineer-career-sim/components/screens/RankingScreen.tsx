"use client";

import { RankingEntry } from "@/lib/types";

export default function RankingScreen({ ranking, onBack }: { ranking: RankingEntry[]; onBack: () => void }) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 80px" }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 12 }}>
        ← 戻る
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🏆 ローカルランキング</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>この端末でのプレイ記録（ベスト50件）。</p>
      {ranking.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>まだ記録がない。1周プレイしてみよう。</p>
      ) : (
        <div style={{ overflowX: "auto" }} className="scrollbar-thin">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "6px 8px" }}>#</th>
                <th style={{ padding: "6px 8px" }}>日付</th>
                <th style={{ padding: "6px 8px" }}>称号</th>
                <th style={{ padding: "6px 8px" }}>評価スコア</th>
                <th style={{ padding: "6px 8px" }}>転職回数</th>
                <th style={{ padding: "6px 8px" }}>エンディング</th>
                <th style={{ padding: "6px 8px" }}>NG+</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 8px" }}>{i + 1}</td>
                  <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{r.date}</td>
                  <td style={{ padding: "6px 8px", fontWeight: 700 }}>{r.title}</td>
                  <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>{r.reputation}</td>
                  <td style={{ padding: "6px 8px" }}>{r.jobChangeCount}</td>
                  <td style={{ padding: "6px 8px" }}>{r.ending}</td>
                  <td style={{ padding: "6px 8px" }}>{r.ngPlusLevel > 0 ? `NG+${r.ngPlusLevel}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
