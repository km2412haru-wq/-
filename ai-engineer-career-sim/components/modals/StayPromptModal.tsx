"use client";

import { Offer } from "@/lib/types";

export default function StayPromptModal({ offer, onResolve }: { offer: Offer; onResolve: (stay: boolean) => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
        <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px" }}>引き止めにあった</h3>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 20 }}>
          「{offer.company.emoji} {offer.company.name} へ転職する」と伝えたところ、上司から慰留された。
          <br />
          このまま現職に残れば給与アップが期待できるが、新天地でのチャンスは失われるかもしれない。
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => onResolve(true)}>
            現職に残る（昇給あり）
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onResolve(false)}>
            予定通り転職する
          </button>
        </div>
      </div>
    </div>
  );
}
