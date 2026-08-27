"use client";

import { ACHIEVEMENTS } from "@/lib/data/achievements";

export default function AchievementsScreen({ unlocked, onBack }: { unlocked: string[]; onBack: () => void }) {
  const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px 80px" }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 12 }}>
        ← 戻る
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🏅 実績コレクション</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        コンプ率 {unlocked.length} / {ACHIEVEMENTS.length}（{pct}%）
      </p>
      <div className="gauge-track" style={{ marginBottom: 20 }}>
        <div className="gauge-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.includes(a.id);
          const showHidden = a.hidden && !got;
          return (
            <div key={a.id} className="card" style={{ padding: 12, opacity: got ? 1 : 0.6 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
                {got ? "✅" : showHidden ? "❔" : "🔒"} {showHidden ? "？？？（隠し実績）" : a.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{showHidden ? "条件を満たすと解放される。" : a.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
