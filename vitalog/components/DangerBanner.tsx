"use client";

import { checkDanger } from "@/lib/dangerCheck";
import type { DailyLog } from "@/types/vitalog";

interface Props {
  dailyLogs: DailyLog[];
}

/** Danger層のバナー。AOSD再燃判定(EmergencyBanner)とは別ロジック・別の見た目で表示する */
export default function DangerBanner({ dailyLogs }: Props) {
  const { triggered, entries } = checkDanger(dailyLogs);
  if (!triggered) return null;

  return (
    <div className="card danger-banner" role="alert">
      <div className="row" style={{ marginBottom: 6 }}>
        <span aria-hidden="true">🚨</span>
        <strong>危険な症状が記録されています</strong>
      </div>
      <p style={{ margin: "4px 0 8px" }}>
        AOSDの再燃とは限りませんが、記録された症状に基づき医療機関への相談をご検討ください。
        緊急性が高いと感じる場合は、ためらわず救急要請(119)も検討してください。
      </p>
      <ul style={{ margin: "4px 0 8px", paddingLeft: 20 }}>
        {entries.map((e) => (
          <li key={e.date}>
            {e.date}: {e.symptoms.join("、")}
          </li>
        ))}
      </ul>
      <p className="field-hint">
        これは記録された内容からの機械的な判定であり、診断ではありません。
        体調が心配な場合は自己判断せず、医療機関に相談してください。
      </p>
    </div>
  );
}
