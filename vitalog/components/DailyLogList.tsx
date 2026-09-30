"use client";

import FerritinEsrRatioNote from "@/components/FerritinEsrRatioNote";
import type { DailyLog } from "@/types/vitalog";

interface Props {
  dailyLogs: DailyLog[];
  onDelete: (id: string) => void;
  /** 簡易記録に「詳細を追記」する */
  onAppend?: (log: DailyLog) => void;
}

export default function DailyLogList({ dailyLogs, onDelete, onAppend }: Props) {
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
            <strong>
              {log.targetDate}
              {log.entryMode === "quick" && (
                <span className="tag" style={{ marginLeft: 8 }}>
                  簡易記録
                </span>
              )}
            </strong>
            <span>
              {log.entryMode === "quick" && onAppend && (
                <button className="btn-secondary" onClick={() => onAppend(log)}>
                  詳細を追記
                </button>
              )}
              <button className="btn-ghost" onClick={() => onDelete(log.id)}>
                削除
              </button>
            </span>
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
                {log.symptoms.map((s) => (
                  <span key={s.name} className="tag">
                    {s.name}({s.severity}){s.unusualNote ? " ⚠︎普段と違う" : ""}
                  </span>
                ))}
                {log.moodReasonTags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
                {(log.dangerSymptoms ?? []).map((d) => (
                  <span key={d} className="tag" style={{ borderColor: "#8f1414", color: "#8f1414" }}>
                    🚨{d}
                  </span>
                ))}
                {log.fatigueUnusual && <span className="tag">⚠︎普段と違う倦怠感</span>}
                {log.loadLevel && <span className="tag">負荷:{log.loadLevel}</span>}
                {typeof log.sleepHours === "number" && (
                  <span className="tag">
                    睡眠 {log.sleepStartTime ? `${log.sleepStartTime}〜 ` : ""}
                    {log.sleepHours}h
                  </span>
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
                {log.labs?.esrMmH != null && <span className="tag">ESR {log.labs.esrMmH}</span>}
              </div>

              <FerritinEsrRatioNote labs={log.labs} />

              {log.medications.length > 0 && (
                <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  服薬:{" "}
                  {log.medications
                    .map((m) => {
                      if (m.registeredMedicationId != null) {
                        // 3状態: 服用(✓) / 未服用(✗) / 未確認(？)。intakeが無い旧データはmigrate前提で服用扱い
                        const takenMark =
                          m.intake === "notTaken"
                            ? "✗未服用 "
                            : m.intake === "unconfirmed"
                              ? "？未確認 "
                              : "✓";
                        return `${takenMark}${m.name}${m.dose ? `(${m.dose})` : ""}`;
                      }
                      // チェックリスト方式導入前に手動で「定期薬」として記録された過去データは、
                      // 種別情報を失わないよう区別して表示する(現行UIでは手動追加は頓服のみ)
                      const legacyMark = m.type === "regular" ? "[旧・定期薬記録]" : "";
                      return `${legacyMark}${m.name}${m.dose ? `(${m.dose})` : ""}`;
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
