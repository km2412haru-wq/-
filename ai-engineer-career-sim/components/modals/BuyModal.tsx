"use client";

import { GameState } from "@/lib/types";
import { HOBBY_ITEMS } from "@/lib/engine/engine";
import { CERTIFICATIONS } from "@/lib/data/certifications";

export default function BuyModal({
  state,
  onBuy,
  onGetCertification,
  onClose,
}: {
  state: GameState;
  onBuy: (itemId: string) => void;
  onGetCertification: (certId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>🛍️ 貯金で買い物をする</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          買い物ができるのは1ヶ月に1回まで。金額が大きいほどモチベーションの伸びも大きい。
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {HOBBY_ITEMS.map((item) => {
            const owned = item.ownedFlag && state[item.ownedFlag];
            const disabled = !!state.hobbySpentThisMonth || state.personalSavings < item.cost || !!owned;
            return (
              <button
                key={item.id}
                className="btn btn-block"
                style={{ justifyContent: "flex-start", padding: "12px 14px", textAlign: "left" }}
                disabled={disabled}
                onClick={() => onBuy(item.id)}
              >
                <span style={{ display: "block" }}>
                  <div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>
                      {item.emoji} {item.label}
                      {owned && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> （所有済み）</span>}
                    </span>
                    <span style={{ color: "var(--warn)" }}>-{item.cost}万円</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginTop: 2 }}>
                    モチベ+{item.motivationGain}
                    {item.fatigueChange < 0 ? ` ・ 疲労${item.fatigueChange}` : ""}
                    {item.techGain ? ` ・ 技術力+${item.techGain}` : ""}
                    {item.oneTime ? "（一度きりの買い物）" : ""}
                  </div>
                </span>
              </button>
            );
          })}
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 800, margin: "18px 0 4px" }}>🎓 資格を取る</h4>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          月の買い物枠とは別枠。一度取得すれば効果はずっと残る、技術力・コミュ力の恒久的な底上げ。
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {CERTIFICATIONS.map((cert) => {
            const owned = state.certifications.includes(cert.id);
            const disabled = owned || state.personalSavings < cert.cost;
            return (
              <button
                key={cert.id}
                className="btn btn-block"
                style={{ justifyContent: "flex-start", padding: "12px 14px", textAlign: "left" }}
                disabled={disabled}
                onClick={() => onGetCertification(cert.id)}
              >
                <span style={{ display: "block" }}>
                  <div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>
                      {cert.emoji} {cert.name}
                      {owned && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> （取得済み）</span>}
                    </span>
                    <span style={{ color: "var(--warn)" }}>-{cert.cost}万円</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginTop: 2 }}>
                    {cert.techGain ? `技術力+${cert.techGain} ` : ""}
                    {cert.commGain ? `・ コミュ力+${cert.commGain}` : ""}
                    ・ モチベ+6
                  </div>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
