"use client";

import { checkEmergency } from "@/lib/emergencyCheck";
import { useMedications } from "@/lib/useMedications";
import type { DailyLog } from "@/types/vitalog";

interface Props {
  dailyLogs: DailyLog[];
}

export default function EmergencyBanner({ dailyLogs }: Props) {
  const { registeredMedications } = useMedications();
  const { triggered, reasonGroups } = checkEmergency(dailyLogs, registeredMedications);
  if (!triggered) return null;

  return (
    <div className="card emergency-banner" role="alert">
      <div className="row" style={{ marginBottom: 6 }}>
        <span aria-hidden="true">⚠️</span>
        <strong>受診を検討してください</strong>
      </div>
      {reasonGroups.map((group) => (
        <div key={group.category} style={{ marginBottom: 8 }}>
          <strong style={{ fontSize: "0.85rem" }}>{group.category}</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
            {group.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="field-hint">
        これは記録された値からの機械的な判定であり、診断ではありません。
        体調が心配な場合は自己判断せず、医療機関に相談してください。
      </p>
    </div>
  );
}
