"use client";

import { useMemo, useState } from "react";
import type { ChartPoint } from "@/lib/trendData";

export interface ChartSeries {
  name: string;
  color: string;
  points: ChartPoint[];
}

interface Props {
  series: ChartSeries[];
  yMin: number;
  yMax: number;
  height?: number;
  unit?: string;
}

const WIDTH = 600;
const PADDING = { top: 12, right: 12, bottom: 24, left: 32 };

export default function TrendChart({ series, yMin, yMax, height = 200, unit = "" }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const allDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of series) for (const p of s.points) set.add(p.date);
    return Array.from(set).sort();
  }, [series]);

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const xForIndex = (i: number) =>
    allDates.length <= 1
      ? PADDING.left + innerWidth / 2
      : PADDING.left + (innerWidth * i) / (allDates.length - 1);

  const yForValue = (v: number) =>
    PADDING.top + innerHeight - ((v - yMin) / (yMax - yMin)) * innerHeight;

  if (allDates.length === 0) {
    return <p className="muted">この期間のデータがありません。</p>;
  }

  const dateIndex = new Map(allDates.map((d, i) => [d, i]));

  const linePaths = series.map((s) => {
    const pts = s.points
      .filter((p) => dateIndex.has(p.date))
      .map((p) => [xForIndex(dateIndex.get(p.date)!), yForValue(p.value)] as const);
    const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
    return { ...s, d, pts };
  });

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    allDates.forEach((_, i) => {
      const dist = Math.abs(xForIndex(i) - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  const hoverDate = hoverIndex !== null ? allDates[hoverIndex] : null;

  return (
    <div>
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.name} className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        width="100%"
        height={height}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={series.map((s) => s.name).join(", ")}
      >
        {tickValues.map((v) => (
          <g key={v}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yForValue(v)}
              y2={yForValue(v)}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <text x={4} y={yForValue(v) + 3} fontSize={10} fill="#898781">
              {Math.round(v * 10) / 10}
            </text>
          </g>
        ))}

        {linePaths.map((s) => (
          <path
            key={s.name}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {linePaths.map((s) =>
          s.pts.map(([x, y], i) => (
            <circle key={`${s.name}-${i}`} cx={x} cy={y} r={2.5} fill={s.color} />
          ))
        )}

        {hoverIndex !== null && (
          <line
            x1={xForIndex(hoverIndex)}
            x2={xForIndex(hoverIndex)}
            y1={PADDING.top}
            y2={height - PADDING.bottom}
            stroke="#c3c2b7"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}
      </svg>
      {hoverDate && (
        <div className="field-hint">
          {hoverDate}:{" "}
          {series
            .map((s) => {
              const point = s.points.find((p) => p.date === hoverDate);
              return point ? `${s.name} ${point.value}${unit}` : null;
            })
            .filter(Boolean)
            .join(" / ")}
        </div>
      )}
    </div>
  );
}
