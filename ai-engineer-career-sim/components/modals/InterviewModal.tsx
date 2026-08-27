"use client";

import { GameState } from "@/lib/types";
import { estimatePassChance, interviewPower, passChanceLabel, stepThreshold } from "@/lib/engine/engine";
import { FOCUS_LABEL } from "@/lib/data/interviewFlavor";
import Gauge from "../ui/Gauge";

export default function InterviewModal({ state, onChallenge }: { state: GameState; onChallenge: () => void }) {
  const interview = state.interview;
  if (!interview) return null;
  const { company, step, flavor, focus } = interview;

  const power = Math.round(interviewPower(state, focus));
  const threshold = stepThreshold(company, step);
  const chance = estimatePassChance(state, company, step);
  const { label, tone } = passChanceLabel(chance);
  const toneColor = tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--bad)";

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span className="tag">
            {company.emoji} {company.name}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            ステップ {step + 1} / {company.interviewSteps.length}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {company.interviewSteps.map((s, i) => (
            <div
              key={s + i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 4,
                background: i < step ? "var(--good)" : i === step ? "var(--accent)" : "var(--gauge-track)",
              }}
            />
          ))}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--text-muted)" }}>{company.interviewSteps[step]}</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 4px" }}>{FOCUS_LABEL[focus]}</p>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: "6px 0 18px" }}>{flavor}</p>

        <div className="card" style={{ padding: 14, background: "var(--bg-sunken)", border: "none", marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
            🔧 技術力 {state.techScore} ・ 💬 コミュ力 {state.commScore}（このステップの実力スコア：{power} / 目安：{threshold}）
          </div>
          <Gauge label="合格の手応え" value={Math.round(chance * 100)} max={100} color={toneColor} suffix="%" />
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: toneColor }}>{label}</div>
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.6 }}>
            クイズの正解不正解ではなく、これまでのアクションで積み上げた技術力・コミュ力・評価スコアがそのまま合否に反映される。
          </p>
        </div>

        <button className="btn btn-primary btn-block" style={{ padding: 14, fontSize: 16 }} onClick={onChallenge}>
          この面接に挑む →
        </button>
      </div>
    </div>
  );
}
