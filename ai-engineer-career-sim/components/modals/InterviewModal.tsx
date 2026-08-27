"use client";

import { InterviewState } from "@/lib/types";

export default function InterviewModal({ interview, onAnswer }: { interview: InterviewState; onAnswer: (optionId: string) => void }) {
  const { company, step, question } = interview;
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
        <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.6, margin: "8px 0 18px" }}>{question.prompt}</p>
        <div style={{ display: "grid", gap: 8 }}>
          {question.options.map((o) => (
            <button key={o.id} className="btn btn-block" style={{ justifyContent: "flex-start", padding: "12px 14px", textAlign: "left" }} onClick={() => onAnswer(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
