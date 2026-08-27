"use client";

import { Company } from "@/lib/types";

const TIER_LABEL: Record<number, string> = {
  5: "最難関",
  4: "難関",
  3: "中堅・人気",
  2: "中間",
  1: "積極採用中",
};

export default function ScoutModal({ company, onOpen, onDismiss }: { company: Company; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ fontSize: 44, marginBottom: 8 }}>📨</div>
        <span className="tag" style={{ marginBottom: 8 }}>
          難易度 {company.tier} ・ {TIER_LABEL[company.tier]}
        </span>
        <h3 style={{ fontSize: 19, fontWeight: 800, margin: "6px 0 4px" }}>
          {company.emoji} {company.name} からスカウトが届いた！
        </h3>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7, margin: "8px 0 20px" }}>{company.flavor}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onDismiss}>
            今回は見送る
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onOpen}>
            選考に進む →
          </button>
        </div>
      </div>
    </div>
  );
}
