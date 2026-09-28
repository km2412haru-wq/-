"use client";

import { useState } from "react";
import { useVisits } from "@/lib/useVisits";
import { useVisitReminders } from "@/lib/useVisitReminders";
import { useMedications } from "@/lib/useMedications";
import { useDailyLogs } from "@/lib/useDailyLogs";
import { applyBulkLabResult } from "@/lib/bulkImport";
import PhotoCaptureButton from "@/components/PhotoCaptureButton";
import MedicationNotebookUpdater from "@/components/MedicationNotebookUpdater";
import type { DailyLog } from "@/types/vitalog";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const LAB_LABELS: { key: keyof NonNullable<DailyLog["labs"]>; label: string }[] = [
  { key: "wbcPerUl", label: "WBC" },
  { key: "ferritinNgMl", label: "フェリチン" },
  { key: "crpMgDl", label: "CRP" },
  { key: "astUL", label: "AST" },
  { key: "altUL", label: "ALT" },
  { key: "plateletsPerUl", label: "血小板" },
];

export default function VisitsManager() {
  const { visits, ready: visitsReady, addVisit, deleteVisit } = useVisits();
  const { registeredMedications, ready: medsReady } = useMedications();
  const { dailyLogs, ready: logsReady } = useDailyLogs();
  const { permission, requestPermission } = useVisitReminders(visits);

  const [visitDate, setVisitDate] = useState(todayIso());
  const [hospitalName, setHospitalName] = useState("");
  const [department, setDepartment] = useState("");
  const [memo, setMemo] = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [pendingLabs, setPendingLabs] = useState<NonNullable<DailyLog["labs"]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!visitsReady || !medsReady || !logsReady) return null;

  const upcoming = visits
    .filter((v) => v.nextVisitDate && v.nextVisitDate >= todayIso())
    .sort((a, b) => (a.nextVisitDate! < b.nextVisitDate! ? -1 : 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addVisit({
      visitDate,
      hospitalName: hospitalName.trim() || undefined,
      department: department.trim() || undefined,
      memo: memo.trim() || undefined,
      nextVisitDate: nextVisitDate || undefined,
    });

    if (Object.keys(pendingLabs).length > 0) {
      applyBulkLabResult(visitDate, pendingLabs);
    }

    setMessage("通院記録を保存しました。");
    setHospitalName("");
    setDepartment("");
    setMemo("");
    setNextVisitDate("");
    setPendingLabs({});
    setVisitDate(todayIso());
    setTimeout(() => setMessage(null), 3000);
  };

  const labsForDate = (date: string) => dailyLogs.find((l) => l.targetDate === date)?.labs;

  return (
    <>
      <div className="card">
        <h2>+ 通院記録を追加</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="visitDate">受診日</label>
            <input
              id="visitDate"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              max={todayIso()}
            />
          </div>
          <div className="row" style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="病院名(任意)"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="診療科(任意)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>

          <div className="field">
            <label>検査結果の写真(複数可、追加するたびに数値が統合されます)</label>
            <div className="row">
              {LAB_LABELS.filter((l) => pendingLabs[l.key] != null).map((l) => (
                <span key={l.key} className="tag">
                  {l.label} {pendingLabs[l.key]}
                </span>
              ))}
            </div>
            <PhotoCaptureButton
              kind="labResult"
              label="📷 検査結果の写真を追加"
              onConfirm={(fields) => {
                setPendingLabs((prev) => ({
                  ...prev,
                  wbcPerUl: fields.wbcPerUl ?? prev.wbcPerUl,
                  ferritinNgMl: fields.ferritinNgMl ?? prev.ferritinNgMl,
                  crpMgDl: fields.crpMgDl ?? prev.crpMgDl,
                  astUL: fields.astUL ?? prev.astUL,
                  altUL: fields.altUL ?? prev.altUL,
                  plateletsPerUl: fields.plateletsPerUl ?? prev.plateletsPerUl,
                }));
              }}
            />
          </div>

          <div className="field">
            <label>お薬手帳の更新(任意)</label>
            <p className="field-hint">
              服用薬が変わった場合はここから更新できます(この操作は「この内容で更新」を
              押した時点で個別に反映され、下の「通院記録を保存」とは別に確定します)。
            </p>
            <MedicationNotebookUpdater registeredMedications={registeredMedications} />
          </div>

          <div className="field">
            <label htmlFor="visitMemo">医師から言われたこと等のメモ</label>
            <textarea
              id="visitMemo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="自由記述(任意)"
            />
          </div>

          <div className="field">
            <label htmlFor="nextVisitDate">次回受診予定日(任意)</label>
            <input
              id="nextVisitDate"
              type="date"
              value={nextVisitDate}
              onChange={(e) => setNextVisitDate(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary">
            通院記録を保存
          </button>
          {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
        </form>
      </div>

      <div className="card">
        <h2>次回受診予定</h2>
        {permission === "default" && (
          <button type="button" className="btn-secondary" onClick={requestPermission}>
            通知を許可する
          </button>
        )}
        <p className="field-hint">
          ※通知はアプリ(このタブ)を開いている間のみ動作します(前日・当日の朝9時台にチェックします)。
        </p>
        {upcoming.length === 0 && <p className="muted">予定なし</p>}
        {upcoming.map((v) => (
          <div key={v.id} className="log-entry">
            <strong>{v.nextVisitDate}</strong> {v.hospitalName}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>通院履歴</h2>
        {visits.length === 0 && <p className="muted">記録なし</p>}
        {visits.map((v) => {
          const labs = labsForDate(v.visitDate);
          const expanded = expandedId === v.id;
          return (
            <div key={v.id} className="log-entry">
              <div
                className="row"
                style={{ justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setExpandedId(expanded ? null : v.id)}
              >
                <div>
                  <strong>{v.visitDate}</strong> {v.hospitalName}
                  {v.department && <span className="muted"> / {v.department}</span>}
                  {v.memo && <span className="tag">メモあり</span>}
                  {labs && <span className="tag">検査値あり</span>}
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVisit(v.id);
                  }}
                >
                  削除
                </button>
              </div>
              {expanded && (
                <div style={{ marginTop: 8 }}>
                  {v.memo && <p>{v.memo}</p>}
                  {v.nextVisitDate && <p className="muted">次回受診予定: {v.nextVisitDate}</p>}
                  {labs && (
                    <div className="row">
                      {LAB_LABELS.filter((l) => labs[l.key] != null).map((l) => (
                        <span key={l.key} className="tag">
                          {l.label} {labs[l.key]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
