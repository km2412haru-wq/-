"use client";

import { useRef, useState } from "react";
import { generateId } from "@/lib/id";
import { savePhotoBlob } from "@/lib/photoStore";
import { fileToBase64 } from "@/lib/fileToBase64";
import type {
  ExtractedLabFields,
  ExtractedMedicationFields,
  ExtractedTopicalFields,
  ExtractPhotoResponse,
  PhotoCaptureKind,
} from "@/types/photoCapture";

type Fields = ExtractedMedicationFields & ExtractedTopicalFields & ExtractedLabFields;

type Status =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "error"; message: string }
  | { step: "reviewing"; fields: Fields; blob: Blob };

interface Props {
  kind: PhotoCaptureKind;
  label: string;
  /** ユーザーが確認・編集を終えて確定した内容。keepPhotoが真の場合のみphotoIdが入る */
  onConfirm: (fields: Fields, photoId?: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "品目名",
  dose: "用量",
  site: "使用部位",
  note: "メモ",
  wbcPerUl: "WBC(/μL)",
  ferritinNgMl: "フェリチン(ng/mL)",
  crpMgDl: "CRP(mg/dL)",
  astUL: "AST(U/L)",
  altUL: "ALT(U/L)",
  plateletsPerUl: "血小板数(/μL)",
};

const NUMBER_FIELDS = new Set([
  "wbcPerUl",
  "ferritinNgMl",
  "crpMgDl",
  "astUL",
  "altUL",
  "plateletsPerUl",
]);

const FIELDS_BY_KIND: Record<PhotoCaptureKind, string[]> = {
  medication: ["name", "dose"],
  topical: ["name", "site", "note"],
  labResult: ["wbcPerUl", "ferritinNgMl", "crpMgDl", "astUL", "altUL", "plateletsPerUl"],
  // お薬手帳は複数件抽出になるため、この単一項目編集UIでは扱わない(専用UIを別途持つ)
  medicationNotebook: [],
};

export default function PhotoCaptureButton({ kind, label, onConfirm }: Props) {
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const [keepPhoto, setKeepPhoto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setStatus({ step: "loading" });
    try {
      const { base64, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/extract-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, imageBase64: base64, mediaType }),
      });
      const data: ExtractPhotoResponse = await res.json();
      if (!data.fields) {
        setStatus({
          step: "error",
          message: data.message || "自動読み取りは利用できません。手動で入力してください。",
        });
        return;
      }
      setStatus({ step: "reviewing", fields: data.fields as Fields, blob: file });
      setKeepPhoto(false);
    } catch (err) {
      console.error(err);
      setStatus({ step: "error", message: "通信に失敗しました。手動で入力してください。" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const updateField = (key: string, value: string) => {
    if (status.step !== "reviewing") return;
    const parsed = NUMBER_FIELDS.has(key) ? (value === "" ? undefined : Number(value)) : value || undefined;
    setStatus({ ...status, fields: { ...status.fields, [key]: parsed } });
  };

  const handleConfirm = async () => {
    if (status.step !== "reviewing") return;
    let photoId: string | undefined;
    if (keepPhoto) {
      photoId = generateId();
      try {
        await savePhotoBlob(photoId, status.blob);
      } catch (err) {
        console.error("写真の保存に失敗しました:", err);
        photoId = undefined;
      }
    }
    onConfirm(status.fields, photoId);
    setStatus({ step: "idle" });
  };

  const handleCancel = () => {
    // レビューを破棄するだけ。この時点まで何もDailyLogにもIndexedDBにも保存していない
    setStatus({ step: "idle" });
  };

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {status.step === "idle" && (
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>
          {label}
        </button>
      )}

      {status.step === "loading" && <p className="muted">写真を解析しています...</p>}

      {status.step === "error" && (
        <div>
          <p className="field-hint">{status.message}</p>
          <button type="button" className="btn-ghost" onClick={() => setStatus({ step: "idle" })}>
            閉じる
          </button>
        </div>
      )}

      {status.step === "reviewing" && (
        <div className="card" style={{ background: "#f9fafb" }}>
          <p className="field-hint">
            写真から読み取った内容です。誤りがあれば修正してから「この内容で記録」を押してください。
          </p>
          {FIELDS_BY_KIND[kind].map((key) => (
            <div className="field" key={key}>
              <label htmlFor={`extract-${key}`}>{FIELD_LABELS[key]}</label>
              <input
                id={`extract-${key}`}
                type={NUMBER_FIELDS.has(key) ? "number" : "text"}
                value={(status.fields as Record<string, unknown>)[key] as string | number | undefined ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
              />
            </div>
          ))}

          <label style={{ display: "block", marginBottom: 12 }}>
            <input type="checkbox" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} />{" "}
            元画像をこの端末に保持する(氏名・病院名等が写り込む場合があります。推奨: 保持しない)
          </label>

          <div className="row">
            <button type="button" className="btn-primary" onClick={handleConfirm}>
              この内容で記録
            </button>
            <button type="button" className="btn-ghost" onClick={handleCancel}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
