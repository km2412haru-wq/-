"use client";

import { EffectHint } from "@/lib/types";

const TONE_STYLE: Record<EffectHint["tone"], { bg: string; fg: string }> = {
  good: { bg: "var(--good-soft)", fg: "var(--good)" },
  bad: { bg: "var(--bad-soft)", fg: "var(--bad)" },
  neutral: { bg: "var(--gauge-track)", fg: "var(--text-muted)" },
};

export default function EffectChips({ effects }: { effects: EffectHint[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {effects.map((e, i) => {
        const s = TONE_STYLE[e.tone];
        return (
          <span
            key={i}
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 999,
              background: s.bg,
              color: s.fg,
              whiteSpace: "nowrap",
            }}
          >
            {e.label}
          </span>
        );
      })}
    </div>
  );
}
