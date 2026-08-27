"use client";

import { Company, GameState } from "@/lib/types";
import { COMPANIES } from "@/lib/data/companies";
import { estimatePassChance, passChanceLabel } from "@/lib/engine/engine";

const TIER_LABEL: Record<number, string> = {
  5: "難易度5・最難関",
  4: "難易度4・難関",
  3: "難易度3・中堅人気",
  2: "難易度2・中間",
  1: "難易度1・積極採用中",
};

export default function ApplyModal({ state, onApply, onClose }: { state: GameState; onApply: (companyId: string) => void; onClose: () => void }) {
  const tiers = [5, 4, 3, 2, 1] as const;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>💼 応募する企業を選ぶ</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          応募にはAPを1消費する。選考はクイズではなく、技術力・コミュ力・実績スコアという「実力」の数値で合否が決まる。ボタンの手応え表示が入り口の合格目安の参考になる。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: "56vh", overflowY: "auto" }} className="scrollbar-thin">
          {tiers.map((tier) => {
            const companies: Company[] = COMPANIES.filter((c) => c.tier === tier);
            return (
              <div key={tier}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>{TIER_LABEL[tier]}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {companies.map((c) => {
                    const cooldownUntil = state.appliedRecently[c.id];
                    const onCooldown = cooldownUntil !== undefined && state.week - cooldownUntil < 6;
                    const isCurrent = state.currentCompany.id === c.id;
                    const { label, tone } = passChanceLabel(estimatePassChance(state, c, 0));
                    const toneColor = tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--bad)";
                    return (
                      <button
                        key={c.id}
                        className="btn"
                        disabled={onCooldown || isCurrent || state.ap < 1}
                        title={c.flavor}
                        onClick={() => onApply(c.id)}
                        style={{ fontSize: 13, flexDirection: "column", alignItems: "flex-start", gap: 2 }}
                      >
                        <span>
                          {c.emoji} {c.name}
                        </span>
                        {onCooldown ? (
                          <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 500 }}>選考中断中</span>
                        ) : (
                          !isCurrent && (
                            <span style={{ fontSize: 10.5, color: toneColor, fontWeight: 700 }}>入り口の手応え：{label}</span>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
