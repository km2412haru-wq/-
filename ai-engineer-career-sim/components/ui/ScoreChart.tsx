"use client";

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { HistoryPoint } from "@/lib/types";

export default function ScoreChart({ history }: { history: HistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={history} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="week" tick={{ fill: "var(--text-muted)", fontSize: 11 }} label={{ value: "週", position: "insideBottomRight", fontSize: 10, fill: "var(--text-muted)" }} />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} domain={[0, "auto"]} />
        <Tooltip
          contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: "var(--text)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="quality" name="精度" stroke="#4f46e5" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="satisfaction" name="満足度" stroke="#0f8a4a" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="reputation" name="評価スコア" stroke="#d92d3f" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
