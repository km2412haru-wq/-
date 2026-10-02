"use client";

import { useRef, useState } from "react";
import { fileToBase64 } from "@/lib/fileToBase64";
import {
  applyPrescriptionToRegisteredMedications,
  discontinueRegisteredMedication,
} from "@/lib/bulkImport";
import type { RegisteredMedication } from "@/types/vitalog";
import type { ExtractedNotebookEntry, ExtractPhotoResponse } from "@/types/photoCapture";

type DiffKind = "new" | "changed" | "resumed" | "discontinued";

interface DiffItem {
  kind: DiffKind;
  name: string;
  oldDose?: string;
  newDose?: string;
  documentDate?: string;
  checked: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  registeredMedications: RegisteredMedication[];
}

export default function MedicationNotebookUpdater({ registeredMedications }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "reviewing">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const buildDiff = (entries: ExtractedNotebookEntry[]): DiffItem[] => {
    const activeMeds = registeredMedications.filter((m) => m.active);
    const extractedNames = new Set(entries.map((e) => e.name).filter(Boolean) as string[]);

    const items: DiffItem[] = [];

    for (const entry of entries) {
      if (!entry.name) continue;
      const activeMatch = activeMeds.find((m) => m.name === entry.name);
      if (activeMatch) {
        if (activeMatch.dose !== entry.dose) {
          items.push({
            kind: "changed",
            name: entry.name,
            oldDose: activeMatch.dose,
            newDose: entry.dose,
            documentDate: entry.documentDate,
            checked: true,
          });
        }
        continue;
      }

      // active一致が無ければ、中止済みの同名薬が無いか探す(減薬→再処方の名寄せ)。
      // 一致すれば新規レコードを作らずそれを再利用して「再開」扱いにする
      const inactiveMatch = registeredMedications.find((m) => !m.active && m.name === entry.name);
      if (inactiveMatch) {
        items.push({
          kind: "resumed",
          name: entry.name,
          oldDose: inactiveMatch.dose,
          newDose: entry.dose,
          documentDate: entry.documentDate,
          checked: true,
        });
        continue;
      }

      items.push({
        kind: "new",
        name: entry.name,
        newDose: entry.dose,
        documentDate: entry.documentDate,
        checked: true,
      });
    }

    for (const med of activeMeds) {
      if (!extractedNames.has(med.name)) {
        items.push({ kind: "discontinued", name: med.name, oldDose: med.dose, checked: false });
      }
    }

    return items;
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setStatus("loading");
    setErrorMessage(null);
    try {
      const { base64, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/extract-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "medicationNotebook", imageBase64: base64, mediaType }),
      });
      const data: ExtractPhotoResponse = await res.json();
      const entries = (data.fields?.entries as ExtractedNotebookEntry[] | undefined) ?? null;
      if (!entries) {
        setStatus("error");
        setErrorMessage(data.message || "自動読み取りに失敗しました。");
        return;
      }
      setDiffItems(buildDiff(entries));
      setStatus("reviewing");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("通信に失敗しました。");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const toggleItem = (index: number) => {
    setDiffItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleApply = () => {
    let failed = 0;
    for (const item of diffItems) {
      if (!item.checked) continue;
      const date = item.documentDate || todayIso();
      if (item.kind === "discontinued") {
        if (!discontinueRegisteredMedication(item.name, date)) failed += 1;
      } else if (applyPrescriptionToRegisteredMedications(item.name, item.newDose, date) === "failed") {
        failed += 1;
      }
    }

    // 画面の薬の一覧は保存の完了イベントで自動的に最新になるため、再読み込みは不要
    if (failed > 0) {
      setErrorMessage(`${failed}件を保存できませんでした。保存容量を確認してやり直してください。`);
      setStatus("error");
      return;
    }
    setDiffItems([]);
    setStatus("idle");
  };

  return (
    <div style={{ marginTop: 12 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {status === "idle" && (
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>
          📷 お薬手帳を撮影して更新
        </button>
      )}

      {status === "loading" && <p className="muted">お薬手帳を解析しています...</p>}

      {status === "error" && (
        <div>
          <p className="field-hint">{errorMessage}</p>
          <button type="button" className="btn-ghost" onClick={() => setStatus("idle")}>
            閉じる
          </button>
        </div>
      )}

      {status === "reviewing" && (
        <div className="card" style={{ background: "#f9fafb" }}>
          <p className="field-hint">
            お薬手帳の内容を現在の登録済み定期薬と比較しました。反映したい項目だけチェックして
            「この内容で更新」を押してください(何も反映されません、確定するまでは変更なし)。
          </p>
          {diffItems.length === 0 && <p className="muted">差分はありませんでした。</p>}
          {diffItems.map((item, i) => (
            <label key={`${item.kind}-${item.name}-${i}`} style={{ display: "block", marginBottom: 8 }}>
              <input type="checkbox" checked={item.checked} onChange={() => toggleItem(i)} />{" "}
              {item.kind === "new" && (
                <span className="tag">新規</span>
              )}
              {item.kind === "changed" && <span className="tag">用量変更</span>}
              {item.kind === "resumed" && <span className="tag">再開</span>}
              {item.kind === "discontinued" && <span className="tag">中止候補</span>}{" "}
              <strong>{item.name}</strong>{" "}
              {(item.kind === "changed" || item.kind === "resumed") && (
                <span className="muted">
                  {item.oldDose ?? "(不明)"} → {item.newDose ?? "(不明)"}
                </span>
              )}
              {item.kind === "new" && item.newDose && <span className="muted">({item.newDose})</span>}
              {item.kind === "discontinued" && item.oldDose && (
                <span className="muted">({item.oldDose})</span>
              )}
            </label>
          ))}

          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn-primary" onClick={handleApply}>
              この内容で更新
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setStatus("idle");
                setDiffItems([]);
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
