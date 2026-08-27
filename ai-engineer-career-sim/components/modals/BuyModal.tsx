"use client";

import { Residence, GameState } from "@/lib/types";
import { HOBBY_ITEMS, RESIDENCE_LABEL, RESIDENCE_MOVE_COST, nextResidence } from "@/lib/engine/engine";

export default function BuyModal({
  state,
  onBuy,
  onMoveResidence,
  onClose,
}: {
  state: GameState;
  onBuy: (itemId: string) => void;
  onMoveResidence: (to: Residence) => void;
  onClose: () => void;
}) {
  const upgrade = nextResidence(state.residence);
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
          買い物ができるのは2ヶ月に1回まで。金額が大きいほどモチベーションの伸びも大きい。
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

        <h4 style={{ fontSize: 14, fontWeight: 800, margin: "18px 0 4px" }}>🏠 住み替える</h4>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          買い物枠とは別枠。住まいのグレードを上げると家賃は増えるが、モチベーションが上がり通勤の負担も減る。
        </p>
        {state.boughtHouse ? (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>すでにマイホームを購入済みなので、住み替えの必要はない。</p>
        ) : upgrade ? (
          <button
            className="btn btn-block"
            style={{ justifyContent: "flex-start", padding: "12px 14px", textAlign: "left" }}
            disabled={state.personalSavings < RESIDENCE_MOVE_COST[upgrade]}
            onClick={() => onMoveResidence(upgrade)}
          >
            <span style={{ display: "block" }}>
              <div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>
                  {RESIDENCE_LABEL[state.residence]} → {RESIDENCE_LABEL[upgrade]}
                </span>
                <span style={{ color: "var(--warn)" }}>-{RESIDENCE_MOVE_COST[upgrade]}万円</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginTop: 2 }}>
                引っ越し費用（一度きり）・モチベ+10・以後の家賃は上がるが通勤は楽になる
              </div>
            </span>
          </button>
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>すでに最上級の住まいだ。次はマイホーム購入を検討しよう。</p>
        )}
      </div>
    </div>
  );
}
