"use client";

export default function Gauge({
  label,
  value,
  max,
  color,
  suffix,
  emoji,
  mood,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
  emoji?: string;
  mood?: { emoji: string; label: string };
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
        <span>
          {emoji} {label}
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)", fontWeight: 600 }}>
          {Math.round(value).toLocaleString()}
          {suffix ?? ""} / {max.toLocaleString()}
          {suffix ?? ""}
        </span>
      </div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {mood && (
        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
          {mood.emoji} {mood.label}
        </div>
      )}
    </div>
  );
}
