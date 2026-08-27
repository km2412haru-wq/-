"use client";

import { GameEvent } from "@/lib/types";

export default function EventModal({ event, onChoose }: { event: GameEvent; onChoose: (choiceId: string) => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ fontSize: 40, marginBottom: 8 }}>{event.emoji}</div>
        <h3 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px" }}>{event.title}</h3>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 20 }}>{event.description}</p>
        <div style={{ display: "grid", gap: 8 }}>
          {event.choices.map((c) => (
            <button key={c.id} className="btn btn-block" style={{ justifyContent: "flex-start", padding: "12px 14px" }} onClick={() => onChoose(c.id)}>
              <span style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>{c.label}</div>
                {c.tooltip && <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginTop: 2 }}>{c.tooltip}</div>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
