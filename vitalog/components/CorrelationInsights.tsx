"use client";

import { useMemo } from "react";
import { useDailyLogs } from "@/lib/useDailyLogs";
import { computeLagCorrelations } from "@/lib/correlationAnalysis";

/**
 * F5/F6/F11: ラグ相関分析の結果表示(叩き台)。
 * 30/90/365日での段階解禁ではなく、記録があるだけ常に計算し、サンプル数に応じた
 * 信頼度ラベルを添える。直近の記録の値も併記することで、F6(予防的な気づき)の
 * 役割も軽く兼ねている(閾値学習によるアラート通知そのものではない)。
 */
export default function CorrelationInsights() {
  const { dailyLogs, ready } = useDailyLogs();
  const findings = useMemo(() => computeLagCorrelations(dailyLogs), [dailyLogs]);

  if (!ready) return null;

  return (
    <div className="card">
      <h3>相関分析(参考情報)</h3>
      <p className="field-hint">
        記録データから、ある項目と数日後の体調・症状との関連(ラグ相関)を機械的に算出したものです。
        統計的な有意差検定ではなく単純な相関係数(r)であり、因果関係を示すものでもありません。
        サンプル数(n)が少ないうちは特に参考程度に留めてください。記録が増えるほど信頼度が上がります。
      </p>
      {findings.length === 0 ? (
        <p className="muted">
          相関を計算できるだけの記録がまだありません。記録を続けると、ここに傾向が表示されます。
        </p>
      ) : (
        <ul>
          {findings.map((f) => (
            <li key={`${f.predictorLabel}-${f.outcomeLabel}-${f.lagDays}`} style={{ marginBottom: 8 }}>
              {f.predictorLabel}が高い日ほど、{f.lagDays === 0 ? "同じ日" : `${f.lagDays}日後`}の
              {f.outcomeLabel}が{f.r > 0 ? "高くなる" : "低くなる"}傾向
              <span className="muted">
                {" "}
                (r={f.r}, n={f.n}日分, 信頼度: {f.confidence})
              </span>
              {typeof f.latestPredictorValue === "number" && (
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  直近の記録での{f.predictorLabel}: {f.latestPredictorValue}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
