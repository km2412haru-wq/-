"use client";

import { useMemo, useState } from "react";
import { useDailyLogs } from "@/lib/useDailyLogs";
import { useVisits } from "@/lib/useVisits";
import { DATE_RANGE_OPTIONS, filterByRange, type DateRangeKey } from "@/lib/trendData";
import { buildReport } from "@/lib/report";

const RANGE_LABELS: Record<DateRangeKey, string> = {
  "7d": "過去7日間",
  "30d": "過去30日間",
  "90d": "過去90日間",
  all: "全期間",
};

export default function ReportView() {
  const { dailyLogs, ready } = useDailyLogs();
  const { visits, ready: visitsReady } = useVisits();
  const [range, setRange] = useState<DateRangeKey>("30d");

  const filtered = useMemo(() => filterByRange(dailyLogs, range), [dailyLogs, range]);
  const report = useMemo(() => buildReport(filtered), [filtered]);
  const recentVisits = useMemo(() => visits.slice(0, 5), [visits]);

  if (!ready || !visitsReady) return null;

  return (
    <div>
      <div className="card no-print">
        <h2>医師向けレポート</h2>
        <p className="field-hint">
          記録データの統計サマリーを1画面にまとめます。印刷ボタンからPDFとして保存できます
          (ブラウザの印刷ダイアログで「PDFに保存」を選んでください)。診断結果ではなく、
          あくまで自己申告の記録である旨は受診時にお伝えください。
        </p>
        <div className="row" style={{ marginBottom: 12 }}>
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
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          🖨 印刷 / PDFに保存
        </button>
      </div>

      <div className="card report-print-area">
        <h2>Vitalog 記録サマリー</h2>
        <p className="muted">
          対象期間: {RANGE_LABELS[range]}(記録日数 {report.entryCount}日) ／ 出力日:{" "}
          {new Date().toLocaleDateString("ja-JP")}
        </p>
        <p className="field-hint">
          ※本記録は患者本人による自己申告の記録であり、診断結果ではありません。
        </p>

        <h3>体調の概況</h3>
        <ul>
          <li>体調スコア平均: {report.avgConditionScore ?? "-"} / 10</li>
          <li>気分スコア平均: {report.avgMoodScore ?? "-"} / 10</li>
          <li>
            体温: {report.temperatureMin ?? "-"}℃ 〜 {report.temperatureMax ?? "-"}℃
          </li>
          <li>「普段と違う強い倦怠感」の記録日数: {report.fatigueUnusualCount}日</li>
        </ul>

        <h3>関節痛(部位別の記録日数)</h3>
        {report.jointPainCounts.length === 0 ? (
          <p className="muted">記録なし</p>
        ) : (
          <ul>
            {report.jointPainCounts.map((c) => (
              <li key={c.site}>
                {c.site}: {c.count}日
              </li>
            ))}
          </ul>
        )}

        <h3>症状別の記録日数(その症状があった日数)</h3>
        {report.symptomCounts.length === 0 ? (
          <p className="muted">記録なし</p>
        ) : (
          <ul>
            {report.symptomCounts.map((c) => (
              <li key={c.name}>
                {c.name}: {c.count}日
              </li>
            ))}
          </ul>
        )}

        <h3>症状(「普段と違う」感覚があった日)</h3>
        {report.symptomUnusualEntries.length === 0 ? (
          <p className="muted">記録なし</p>
        ) : (
          <p>
            {report.symptomUnusualEntries.map((e) => `${e.date}(${e.name})`).join(", ")}
          </p>
        )}

        <h3>睡眠と翌日の体調の関連</h3>
        <p className="field-hint">
          睡眠時間が{report.sleepCorrelation.thresholdHours}時間未満だった日と、それ以外の日とで、
          翌日に何らかの症状(症状記録・関節痛・普段と違う倦怠感のいずれか)があった割合を比較します。
          記録日数が少ないうちは参考程度にご覧ください。
        </p>
        {report.sleepCorrelation.lowSleepDays === 0 && report.sleepCorrelation.normalSleepDays === 0 ? (
          <p className="muted">睡眠時間と翌日の記録が揃っている日がありません</p>
        ) : (
          <ul>
            <li>
              睡眠不足({report.sleepCorrelation.thresholdHours}時間未満)の翌日に症状あり:{" "}
              {report.sleepCorrelation.lowSleepFollowedByIssuePercent ?? "-"}%
              ({report.sleepCorrelation.lowSleepDays}日中)
            </li>
            <li>
              それ以外の睡眠の翌日に症状あり:{" "}
              {report.sleepCorrelation.normalSleepFollowedByIssuePercent ?? "-"}%
              ({report.sleepCorrelation.normalSleepDays}日中)
            </li>
          </ul>
        )}

        <h3>服薬</h3>
        <p>
          定期薬・頓服: {report.medicationNames.length ? report.medicationNames.join(", ") : "記録なし"}
        </p>
        <p>
          外用薬:{" "}
          {report.topicalMedicationNames.length
            ? report.topicalMedicationNames.join(", ")
            : "記録なし"}
        </p>

        <h3>直近の通院履歴</h3>
        {recentVisits.length === 0 ? (
          <p className="muted">記録なし</p>
        ) : (
          <ul>
            {recentVisits.map((v) => (
              <li key={v.id}>
                <strong>{v.visitDate}</strong> {v.hospitalName}
                {v.department && ` / ${v.department}`}
                {v.memo && ` — ${v.memo}`}
                {v.nextVisitDate && `(次回: ${v.nextVisitDate})`}
              </li>
            ))}
          </ul>
        )}

        <h3>自由メモ</h3>
        {report.memoEntries.length === 0 ? (
          <p className="muted">記録なし</p>
        ) : (
          <ul>
            {report.memoEntries.map((m) => (
              <li key={m.date}>
                <strong>{m.date}</strong>: {m.memo}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
