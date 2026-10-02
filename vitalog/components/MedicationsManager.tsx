"use client";

import { useState } from "react";
import { useForegroundReminders } from "@/lib/useForegroundReminders";
import { useMedications } from "@/lib/useMedications";
import MedicationNotebookUpdater from "@/components/MedicationNotebookUpdater";
import BulkImportManager from "@/components/BulkImportManager";
import { MEDICATION_TYPES, type MedicationType } from "@/types/vitalog";
import { localTodayIso } from "@/lib/dateUtil";

export default function MedicationsManager() {
  const {
    registeredMedications,
    taperingEvents,
    ready,
    addMedication,
    updateMedication,
    deleteMedication,
    addTaperingEvent,
    deleteTaperingEvent,
  } = useMedications();
  const { permission, requestPermission } = useForegroundReminders(registeredMedications);

  const todayIso = () => localTodayIso();

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [type, setType] = useState<MedicationType>("regular");
  const [startDate, setStartDate] = useState(todayIso());
  const [reminderTime, setReminderTime] = useState("");

  const [taperMedName, setTaperMedName] = useState("");
  const [taperDate, setTaperDate] = useState(localTodayIso());
  const [taperDose, setTaperDose] = useState("");
  const [taperNote, setTaperNote] = useState("");

  if (!ready) return null;

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const saved = addMedication({
      name: name.trim(),
      dose: dose.trim() || undefined,
      type,
      startDate: startDate || undefined,
      reminderTime: reminderTime || undefined,
    });
    if (!saved) return; // 保存できなかった時は入力を残す
    setName("");
    setDose("");
    setStartDate(todayIso());
    setReminderTime("");
  };

  const handleAddTapering = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taperMedName.trim() || !taperDose.trim()) return;
    const saved = addTaperingEvent({
      medicationName: taperMedName.trim(),
      date: taperDate,
      newDose: taperDose.trim(),
      note: taperNote.trim() || undefined,
    });
    if (!saved) return;
    setTaperDose("");
    setTaperNote("");
  };

  return (
    <>
      <div className="card">
        <h2>登録済みの薬</h2>
        <p className="field-hint">
          ここに登録した薬は服薬リマインダーの元データになります(下記の通知許可が必要)。
        </p>

        {permission === "unsupported" && (
          <p className="muted">このブラウザは通知に対応していません。</p>
        )}
        {permission === "default" && (
          <button type="button" className="btn-secondary" onClick={requestPermission}>
            リマインダー通知を許可する
          </button>
        )}
        {permission === "denied" && (
          <p className="muted">通知がブロックされています。ブラウザの設定から許可してください。</p>
        )}
        {permission === "granted" && (
          <p className="muted">
            通知は許可済みです。※アプリ(このタブ)を開いている間のみ届きます。
          </p>
        )}

        {registeredMedications.map((m) => (
          <div key={m.id} className="log-entry">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{m.name}</strong>
                {m.dose && <span className="muted"> ({m.dose})</span>}
                <span className="tag">{m.type === "regular" ? "定期薬" : "頓服"}</span>
                {m.startDate && <span className="tag">開始 {m.startDate}</span>}
                {m.reminderTime && <span className="tag">通知 {m.reminderTime}</span>}
                {!m.active && (
                  <span className="tag">中止済み{m.endDate ? `(${m.endDate})` : ""}</span>
                )}
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    updateMedication(
                      m.id,
                      m.active
                        ? { active: false, endDate: todayIso() }
                        : { active: true, endDate: undefined }
                    )
                  }
                >
                  {m.active ? "中止にする" : "再開する"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => deleteMedication(m.id)}>
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}

        <form onSubmit={handleAddMedication} style={{ marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="薬品名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 2 }}
            />
            <input
              type="text"
              placeholder="用量(任意)"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <div className="row" style={{ marginBottom: 8 }}>
            <select value={type} onChange={(e) => setType(e.target.value as MedicationType)}>
              {MEDICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "regular" ? "定期薬" : "頓服"}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="medStartDate">処方開始日(登録日)</label>
            <input
              id="medStartDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p className="field-hint">
              毎日の記録画面のチェックリストは、対象日がこの日より前の場合は表示されません。
              以前から飲んでいる薬を今登録する場合は、実際に飲み始めた日に変更してください。
            </p>
          </div>
          <p className="field-hint">
            ※通知はアプリ(このタブ)を開いている間のみ動作します。閉じている間や画面ロック中は届きません。
          </p>
          <button type="submit" className="btn-secondary">
            ＋ 薬を登録
          </button>
        </form>

        <MedicationNotebookUpdater registeredMedications={registeredMedications} />
      </div>

      <div className="card">
        <h2>減薬・増薬(テーパリング)履歴</h2>
        {taperingEvents.length === 0 && <p className="muted">記録なし</p>}
        {taperingEvents.map((ev) => (
          <div key={ev.id} className="log-entry">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{ev.date}</strong> {ev.medicationName} → {ev.newDose}
                {ev.note && <div className="muted">{ev.note}</div>}
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => deleteTaperingEvent(ev.id)}
              >
                削除
              </button>
            </div>
          </div>
        ))}

        <form onSubmit={handleAddTapering} style={{ marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <input
              type="date"
              value={taperDate}
              onChange={(e) => setTaperDate(e.target.value)}
            />
            <input
              type="text"
              placeholder="薬品名"
              value={taperMedName}
              onChange={(e) => setTaperMedName(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="変更後の用量"
              value={taperDose}
              onChange={(e) => setTaperDose(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <input
            type="text"
            placeholder="メモ(任意)"
            value={taperNote}
            onChange={(e) => setTaperNote(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <button type="submit" className="btn-secondary">
            ＋ 変更履歴を追加
          </button>
        </form>
      </div>

      <BulkImportManager />
    </>
  );
}
