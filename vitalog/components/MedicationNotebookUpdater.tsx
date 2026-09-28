"use client";

import { useRef, useState } from "react";
import { fileToBase64 } from "@/lib/fileToBase64";
import {
  applyPrescriptionToRegisteredMedications,
  discontinueRegisteredMedication,
} from "@/lib/bulkImport";
import type { RegisteredMedication } from "@/types/vitalog";
import type { ExtractedNotebookEntry, ExtractPhotoResponse } from "@/types/photoCapture";

type DiffKind = "new" | "changed" | "discontinued";

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
      const existing = activeMeds.find((m) => m.name === entry.name);
      if (!existing) {
        items.push({
          kind: "new",
          name: entry.name,
          newDose: entry.dose,
          documentDate: entry.documentDate,
          checked: true,
        });
      } else if (existing.dose !== entry.dose) {
        items.push({
          kind: "changed",
          name: entry.name,
          oldDose: existing.dose,
          newDose: entry.dose,
          documentDate: entry.documentDate,
          checked: true,
        });
      }
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
    for (const item of diffItems) {
      if (!item.checked) continue;
      const date = item.documentDate || todayIso();
      if (item.kind === "discontinued") {
        discontinueRegisteredMedication(item.name, date);
      } else {
        applyPrescriptionToRegisteredMedications(item.name, item.newDose, date);
      }
    }

    // 「登録済みの薬」はReactの状態管理を経由せず直接storageを更新しているため、
    // 画面表示を最新化するために再読み込みする
    window.location.reload();
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
              {item.kind === "discontinued" && <span className="tag">中止候補</span>}{" "}
              <strong>{item.name}</strong>{" "}
              {item.kind === "changed" && (
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
