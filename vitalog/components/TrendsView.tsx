"use client";

import { useMemo, useState } from "react";
import TrendChart from "@/components/TrendChart";
import { useDailyLogs } from "@/lib/useDailyLogs";
import {
  DATE_RANGE_OPTIONS,
  filterByRange,
  latestValue,
  toSeries,
  type DateRangeKey,
} from "@/lib/trendData";

export default function TrendsView() {
  const { dailyLogs, ready } = useDailyLogs();
  const [range, setRange] = useState<DateRangeKey>("30d");

  const filtered = useMemo(() => filterByRange(dailyLogs, range), [dailyLogs, range]);

  if (!ready) return null;

  if (dailyLogs.filter((l) => !l.skipped).length === 0) {
    return (
      <div className="card">
        <p className="muted">記録がまだありません。まずは「毎日の記録」から入力してください。</p>
      </div>
    );
  }

  const conditionSeries = toSeries(filtered, "conditionScore");
  const moodSeries = toSeries(filtered, "moodScore");
  const temperatureSeries = toSeries(filtered, "temperature");
  const sleepSeries = toSeries(filtered, "sleepHours");

  return (
    <div className="card">
      <h2>トレンド</h2>

      <div className="row" style={{ marginBottom: 16 }}>
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className="chip"
            data-active={range === opt.key}
            onClick={() => setRange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="stat-tile-value">{latestValue(filtered, "conditionScore") ?? "-"}</div>
          <div className="stat-tile-label">最新の体調スコア</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{latestValue(filtered, "moodScore") ?? "-"}</div>
          <div className="stat-tile-label">最新の気分スコア</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">
            {latestValue(filtered, "temperature") ?? "-"}
            {latestValue(filtered, "temperature") != null ? "℃" : ""}
          </div>
          <div className="stat-tile-label">最新の体温</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">
            {latestValue(filtered, "sleepHours") ?? "-"}
            {latestValue(filtered, "sleepHours") != null ? "h" : ""}
          </div>
          <div className="stat-tile-label">最新の睡眠時間</div>
        </div>
      </div>

      <h3>体調・気分スコア</h3>
      <TrendChart
        series={[
          { name: "体調スコア", color: "var(--series-condition)", points: conditionSeries },
          { name: "気分スコア", color: "var(--series-mood)", points: moodSeries },
        ]}
        yMin={1}
        yMax={10}
      />

      <h3 style={{ marginTop: 24 }}>体温</h3>
      <TrendChart
        series={[{ name: "体温", color: "var(--series-condition)", points: temperatureSeries }]}
        yMin={35}
        yMax={40}
        unit="℃"
      />

      <h3 style={{ marginTop: 24 }}>睡眠時間</h3>
      <TrendChart
        series={[{ name: "睡眠時間", color: "var(--series-mood)", points: sleepSeries }]}
        yMin={0}
        yMax={12}
        unit="h"
      />
    </div>
  );
}
