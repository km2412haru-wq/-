"use client";

import { useState } from "react";
import { generateId } from "@/lib/id";
import { fileToBase64 } from "@/lib/fileToBase64";
import { savePhotoBlob } from "@/lib/photoStore";
import {
  applyBulkLabResult,
  applyBulkMedication,
  applyPrescriptionToRegisteredMedications,
} from "@/lib/bulkImport";
import type { ExtractPhotoResponse } from "@/types/photoCapture";

type DocKind = "medication" | "labResult";

interface DocRow {
  id: string;
  file: File;
  kind: DocKind;
  status: "pending" | "loading" | "analyzed" | "error";
  errorMessage?: string;
  // 処方箋
  name: string;
  dose: string;
  // 検査結果票
  wbc: string;
  ferritin: string;
  crp: string;
  ast: string;
  alt: string;
  platelets: string;
  esr: string;
  documentDate: string;
  keepPhoto: boolean;
  applyToRegistered: boolean;
}

function newRow(file: File): DocRow {
  return {
    id: generateId(),
    file,
    kind: "medication",
    status: "pending",
    name: "",
    dose: "",
    wbc: "",
    ferritin: "",
    crp: "",
    ast: "",
    alt: "",
    platelets: "",
    esr: "",
    documentDate: "",
    keepPhoto: false,
    applyToRegistered: true,
  };
}

export default function BulkImportManager() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setRows((prev) => [...prev, ...Array.from(files).map(newRow)]);
  };

  const updateRow = (id: string, changes: Partial<DocRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const analyzeRow = async (row: DocRow) => {
    updateRow(row.id, { status: "loading" });
    try {
      const { base64, mediaType } = await fileToBase64(row.file);
      const res = await fetch("/api/extract-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: row.kind, imageBase64: base64, mediaType }),
      });
      const data: ExtractPhotoResponse = await res.json();
      if (!data.fields) {
        updateRow(row.id, {
          status: "error",
          errorMessage: data.message || "自動読み取りに失敗しました。手動で入力してください。",
        });
        return;
      }
      const f = data.fields as Record<string, unknown>;
      updateRow(row.id, {
        status: "analyzed",
        name: typeof f.name === "string" ? f.name : "",
        dose: typeof f.dose === "string" ? f.dose : "",
        wbc: typeof f.wbcPerUl === "number" ? String(f.wbcPerUl) : "",
        ferritin: typeof f.ferritinNgMl === "number" ? String(f.ferritinNgMl) : "",
        crp: typeof f.crpMgDl === "number" ? String(f.crpMgDl) : "",
        ast: typeof f.astUL === "number" ? String(f.astUL) : "",
        alt: typeof f.altUL === "number" ? String(f.altUL) : "",
        platelets: typeof f.plateletsPerUl === "number" ? String(f.plateletsPerUl) : "",
        esr: typeof f.esrMmH === "number" ? String(f.esrMmH) : "",
        documentDate: typeof f.documentDate === "string" ? f.documentDate : "",
      });
    } catch (err) {
      console.error(err);
      updateRow(row.id, { status: "error", errorMessage: "通信に失敗しました。" });
    }
  };

  const analyzeAll = () => {
    rows.filter((r) => r.status === "pending").forEach((r) => analyzeRow(r));
  };

  const readyRows = rows.filter((r) => r.status === "analyzed" && r.documentDate);
  const notReadyCount = rows.length - readyRows.length;

  const handleBulkSave = async () => {
    if (readyRows.length === 0) return;
    setMessage(null);

    for (const row of readyRows) {
      let photoId: string | undefined;
      if (row.keepPhoto) {
        try {
          photoId = generateId();
          await savePhotoBlob(photoId, row.file);
        } catch (err) {
          console.error("写真の保存に失敗しました:", err);
          photoId = undefined;
        }
      }

      if (row.kind === "medication") {
        if (!row.name.trim()) continue;
        applyBulkMedication(row.documentDate, {
          name: row.name.trim(),
          dose: row.dose.trim() || undefined,
          sourcePhotoId: photoId,
        });
        if (row.applyToRegistered) {
          applyPrescriptionToRegisteredMedications(
            row.name.trim(),
            row.dose.trim() || undefined,
            row.documentDate
          );
        }
      } else {
        applyBulkLabResult(row.documentDate, {
          wbcPerUl: row.wbc ? Number(row.wbc) : undefined,
          ferritinNgMl: row.ferritin ? Number(row.ferritin) : undefined,
          crpMgDl: row.crp ? Number(row.crp) : undefined,
          astUL: row.ast ? Number(row.ast) : undefined,
          altUL: row.alt ? Number(row.alt) : undefined,
          plateletsPerUl: row.platelets ? Number(row.platelets) : undefined,
          esrMmH: row.esr ? Number(row.esr) : undefined,
          sourcePhotoId: photoId,
        });
      }
    }

    setMessage(`${readyRows.length}件を記録しました。ページを再読み込みします。`);
    // 「登録済みの薬」等はReactの状態管理を経由せず直接storageを更新しているため、
    // 画面表示を最新化するために再読み込みする
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="card">
      <h2>過去の処方箋・検査結果の一括インポート</h2>
      <p className="field-hint">
        紙の処方箋・検査結果票を複数枚まとめて撮影・選択できます。書類ごとに種類を選んで解析し、
        抽出結果(特に日付・数値)を確認・修正してから「この内容で一括記録」を押すまでは
        何も保存されません。書類の日付をそのまま対象日として、既存の記録があればその日の
        項目だけ追記します(上書きしません)。
      </p>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {rows.length > 0 && (
        <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={analyzeAll}>
          未解析の書類をまとめて解析
        </button>
      )}

      {rows.map((row) => (
        <div key={row.id} className="log-entry">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">{row.file.name}</span>
            <button type="button" className="btn-ghost" onClick={() => removeRow(row.id)}>
              削除
            </button>
          </div>

          <div className="row" style={{ marginTop: 6, marginBottom: 6 }}>
            <button
              type="button"
              className="chip"
              data-active={row.kind === "medication"}
              onClick={() => updateRow(row.id, { kind: "medication" })}
              disabled={row.status !== "pending"}
            >
              処方箋
            </button>
            <button
              type="button"
              className="chip"
              data-active={row.kind === "labResult"}
              onClick={() => updateRow(row.id, { kind: "labResult" })}
              disabled={row.status !== "pending"}
            >
              検査結果票
            </button>
          </div>

          {row.status === "pending" && (
            <button type="button" className="btn-secondary" onClick={() => analyzeRow(row)}>
              解析する
            </button>
          )}
          {row.status === "loading" && <p className="muted">解析中...</p>}
          {row.status === "error" && <p className="field-hint">{row.errorMessage}</p>}

          {row.status === "analyzed" && (
            <>
              <div className="field">
                <label>書類の日付(対象日として使われます)</label>
                <input
                  type="date"
                  value={row.documentDate}
                  onChange={(e) => updateRow(row.id, { documentDate: e.target.value })}
                />
                {!row.documentDate && (
                  <p className="field-hint">⚠️ 日付が読み取れませんでした。手入力してください。</p>
                )}
              </div>

              {row.kind === "medication" ? (
                <>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <input
                      type="text"
                      placeholder="薬品名"
                      value={row.name}
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      style={{ flex: 2 }}
                    />
                    <input
                      type="text"
                      placeholder="用量"
                      value={row.dose}
                      onChange={(e) => updateRow(row.id, { dose: e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <label style={{ display: "block", marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={row.applyToRegistered}
                      onChange={(e) => updateRow(row.id, { applyToRegistered: e.target.checked })}
                    />{" "}
                    服薬管理の「登録済みの薬」にも新規登録/用量変更として反映する
                  </label>
                </>
              ) : (
                <div className="row" style={{ marginBottom: 8 }}>
                  <input
                    type="number"
                    placeholder="WBC"
                    value={row.wbc}
                    onChange={(e) => updateRow(row.id, { wbc: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="フェリチン"
                    value={row.ferritin}
                    onChange={(e) => updateRow(row.id, { ferritin: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="CRP"
                    value={row.crp}
                    onChange={(e) => updateRow(row.id, { crp: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="AST"
                    value={row.ast}
                    onChange={(e) => updateRow(row.id, { ast: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="ALT"
                    value={row.alt}
                    onChange={(e) => updateRow(row.id, { alt: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="血小板"
                    value={row.platelets}
                    onChange={(e) => updateRow(row.id, { platelets: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="ESR"
                    value={row.esr}
                    onChange={(e) => updateRow(row.id, { esr: e.target.value })}
                  />
                </div>
              )}

              <label style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={row.keepPhoto}
                  onChange={(e) => updateRow(row.id, { keepPhoto: e.target.checked })}
                />{" "}
                元画像をこの端末に保持する(推奨: 保持しない)
              </label>
            </>
          )}
        </div>
      ))}

      {rows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn-primary" onClick={handleBulkSave} disabled={readyRows.length === 0}>
            この内容で一括記録({readyRows.length}件)
          </button>
          {notReadyCount > 0 && (
            <p className="field-hint">
              {notReadyCount}件は未解析、または日付が未入力のため対象外です。
            </p>
          )}
        </div>
      )}

      {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
    </div>
  );
}
