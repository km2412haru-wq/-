"use client";

import type { DailyLog } from "@/types/vitalog";

interface Props {
  dailyLogs: DailyLog[];
  onDelete: (id: string) => void;
}

export default function DailyLogList({ dailyLogs, onDelete }: Props) {
  if (dailyLogs.length === 0) {
    return (
      <div className="card">
        <p className="muted">まだ記録がありません。上のフォームから最初の記録を追加してください。</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>記録履歴</h2>
      {dailyLogs.map((log) => (
        <div key={log.id} className="log-entry">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>{log.targetDate}</strong>
            <button className="btn-ghost" onClick={() => onDelete(log.id)}>
              削除
            </button>
          </div>

          {log.skipped ? (
            <div className="muted">この日はスキップしました</div>
          ) : (
            <>
              <div className="row" style={{ marginTop: 4 }}>
                {typeof log.conditionScore === "number" && (
                  <span className="tag">体調 {log.conditionScore}/10</span>
                )}
                {typeof log.moodScore === "number" && (
                  <span className="tag">気分 {log.moodScore}/10</span>
                )}
                {typeof log.temperature === "number" && (
                  <span className="tag">体温 {log.temperature}℃</span>
                )}
                {log.temperature === "unmeasured" && (
                  <span className="tag muted">体温 未測定</span>
                )}
                {log.jointPain.map((p) => (
                  <span key={p.site} className="tag">
                    関節痛:{p.site}({p.severity})
                  </span>
                ))}
                {log.soreThroat && (
                  <span className="tag">
                    咽頭痛({log.soreThroat.severity})
                    {log.soreThroat.unusualNote ? " ⚠︎普段と違う" : ""}
                  </span>
                )}
                {log.moodReasonTags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
                {log.fatigueUnusual && <span className="tag">⚠︎普段と違う倦怠感</span>}
                {log.loadLevel && <span className="tag">負荷:{log.loadLevel}</span>}
                {typeof log.sleepHours === "number" && (
                  <span className="tag">睡眠 {log.sleepHours}h</span>
                )}
                {typeof log.productivityScore === "number" && (
                  <span className="tag">成果実感 {log.productivityScore}/10</span>
                )}
                {log.environment?.temperatureC != null && (
                  <span className="tag">🌡️{log.environment.temperatureC}℃</span>
                )}
                {log.environment?.pressureHpa != null && (
                  <span className="tag">🌬️{log.environment.pressureHpa}hPa</span>
                )}
                {log.environment?.humidityPercent != null && (
                  <span className="tag">💧{log.environment.humidityPercent}%</span>
                )}
                {log.activityTags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
                {log.labs?.wbcPerUl != null && <span className="tag">WBC {log.labs.wbcPerUl}</span>}
                {log.labs?.ferritinNgMl != null && (
                  <span className="tag">フェリチン {log.labs.ferritinNgMl}</span>
                )}
                {log.labs?.crpMgDl != null && <span className="tag">CRP {log.labs.crpMgDl}</span>}
                {log.labs?.astUL != null && <span className="tag">AST {log.labs.astUL}</span>}
                {log.labs?.altUL != null && <span className="tag">ALT {log.labs.altUL}</span>}
                {log.labs?.plateletsPerUl != null && (
                  <span className="tag">血小板 {log.labs.plateletsPerUl}</span>
                )}
              </div>

              {log.medications.length > 0 && (
                <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  服薬:{" "}
                  {log.medications
                    .map((m) => {
                      const takenMark =
                        m.registeredMedicationId != null ? (m.taken === false ? "✗未服用 " : "✓") : "";
                      return `${takenMark}${m.name}${m.dose ? `(${m.dose})` : ""}`;
                    })
                    .join(", ")}
                </div>
              )}

              {log.topicalMedications.length > 0 && (
                <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  外用薬:{" "}
                  {log.topicalMedications
                    .map((t) => `${t.name}${t.site ? `(${t.site})` : ""}`)
                    .join(", ")}
                </div>
              )}

              {log.memo && (
                <div style={{ marginTop: 6, fontSize: "0.9rem" }}>{log.memo}</div>
              )}

              {log.memoTags && log.memoTags.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {log.memoTags.map((t) => (
                    <span key={t} className="tag">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
