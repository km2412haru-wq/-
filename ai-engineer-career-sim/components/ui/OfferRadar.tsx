"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CompanyAxes } from "@/lib/types";

const AXIS_LABELS: Record<keyof CompanyAxes, string> = {
  salary: "給与",
  discretion: "裁量権",
  growth: "成長環境",
  stability: "安定性",
  wlb: "WLB",
  techGrowth: "技術力向上",
  fame: "知名度",
};

export default function OfferRadar({
  series,
}: {
  series: { name: string; color: string; axes: CompanyAxes }[];
}) {
  const data = (Object.keys(AXIS_LABELS) as (keyof CompanyAxes)[]).map((key) => {
    const row: Record<string, string | number> = { axis: AXIS_LABELS[key] };
    for (const s of series) row[s.name] = s.axes[key];
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 9 }} />
        {series.map((s) => (
          <Radar key={s.name} name={s.name} dataKey={s.name} stroke={s.color} fill={s.color} fillOpacity={0.22} strokeWidth={2} />
        ))}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: "var(--text)" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
