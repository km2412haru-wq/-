"use client";

import { GameState } from "@/lib/types";
import OfferRadar from "../ui/OfferRadar";

const COLORS = ["#4f46e5", "#0f8a4a", "#d92d3f", "#b45309", "#0891b2"];

export default function OfferCompareModal({
  state,
  onClose,
  onAccept,
  onDecline,
}: {
  state: GameState;
  onClose: () => void;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
}) {
  const series = [
    {
      name: `現職：${state.currentCompany.name}`,
      color: "#6b6d7c",
      axes: {
        salary: Math.min(100, Math.round((state.salary / 1500) * 100)),
        discretion: state.currentCompany.axes.discretion,
        growth: state.currentCompany.axes.growth,
        stability: state.currentCompany.axes.stability,
        wlb: state.currentCompany.axes.wlb,
        techGrowth: state.currentCompany.axes.techGrowth,
        fame: state.currentCompany.axes.fame,
      },
    },
    ...state.offers.map((o, i) => ({ name: `${o.company.emoji} ${o.company.name}`, color: COLORS[i % COLORS.length], axes: o.rolledAxes })),
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>📊 オファー比較</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        {state.offers.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>まだ届いているオファーはない。スカウトを待つか、自分から応募してみよう。</p>
        ) : (
          <>
            <OfferRadar series={series} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {state.offers.map((o) => (
                <div key={o.offerId} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {o.company.emoji} {o.company.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>想定年収 約{o.rolledSalary}万円</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn" onClick={() => onDecline(o.offerId)}>
                      辞退
                    </button>
                    <button className="btn btn-primary" onClick={() => onAccept(o.offerId)}>
                      内定を受ける
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
