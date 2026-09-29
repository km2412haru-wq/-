"use client";

import { checkEmergency, type EmergencyDataQuality } from "@/lib/emergencyCheck";
import { useMedications } from "@/lib/useMedications";
import type { DailyLog } from "@/types/vitalog";

interface Props {
  dailyLogs: DailyLog[];
}

/** 記録が少ない/無い場合に、判定精度が下がっていることを伝える(記録が無い日は「症状なし」とは扱わない) */
function DataQualityNote({ quality }: { quality: EmergencyDataQuality }) {
  if (quality.recordedDays === 0) {
    return (
      <p className="field-hint">
        直近{quality.windowDays}日間の記録がありません。記録が無い日は「症状なし」とは扱わず判定から
        除いているため、現在の状態は判定できていません。
      </p>
    );
  }
  if (quality.insufficient) {
    return (
      <p className="field-hint">
        直近{quality.windowDays}日のうち記録があるのは{quality.recordedDays}日のみです。記録が無い日は
        「症状なし」とは扱わず判定から除いているため、判定精度が下がっています。
      </p>
    );
  }
  return null;
}

export default function EmergencyBanner({ dailyLogs }: Props) {
  const { registeredMedications } = useMedications();
  const { triggered, reasonGroups, multipleLabAbnormal, dataQuality } = checkEmergency(
    dailyLogs,
    registeredMedications
  );

  if (!triggered) {
    // 「異常なし」の安全宣言に読めないよう、限定的な意味であることを明示する
    return (
      <div className="card status-note" role="status">
        <p style={{ margin: "0 0 6px" }}>
          現在、設定された注意条件に該当した記録はありません。この判定は体調に問題がないことを
          意味するものではなく、記録された内容に基づく参考情報です。
        </p>
        <DataQualityNote quality={dataQuality} />
      </div>
    );
  }

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
            {group.reasons.map((r, i) => (
              <li
                key={r}
                style={
                  multipleLabAbnormal && group.category === "検査値" && i === 0
                    ? { fontWeight: 700 }
                    : undefined
                }
              >
                {r}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <DataQualityNote quality={dataQuality} />
      <p className="field-hint">
        これは記録された値からの機械的な判定であり、診断ではありません。
        体調が心配な場合は自己判断せず、医療機関に相談してください。
      </p>
    </div>
  );
}
