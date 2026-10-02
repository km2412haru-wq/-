"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyAppendImport,
  getLastImportBatch,
  parseAppendBundle,
  planAppendImport,
  undoLastAppendImport,
  type AppendBundle,
  type AppendPlan,
  type PlanStatus,
} from "@/lib/appendImport";
import { loadStore } from "@/lib/storage";

const STATUS_LABEL: Record<PlanStatus, string> = {
  add: "追加",
  merge: "追記",
  same: "既にある",
  conflict: "衝突(取り込まない)",
};

/**
 * 追記インポート。検査値・薬の履歴を、既存の記録を消さずに足す(JSONの「復元」は全体の置き換えで別物)。
 * 適用の前に、何が追加され、何が衝突して取り込まれないかを一覧で確認できる。
 */
export default function AppendImportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [bundle, setBundle] = useState<AppendBundle | null>(null);
  const [plan, setPlan] = useState<AppendPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBatch, setLastBatch] = useState<{ batchId: string; at: string } | null>(null);

  // 取り込み履歴は端末のlocalStorageにあるため、描画の食い違い(SSR)を避けてマウント後に読む
  useEffect(() => {
    setLastBatch(getLastImportBatch());
  }, []);

  const reset = () => {
    setBundle(null);
    setPlan(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File | null) => {
    setMessage(null);
    setError(null);
    setBundle(null);
    setPlan(null);
    if (!file) return;
    const parsed = parseAppendBundle(await file.text());
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setBundle(parsed.bundle);
    setPlan(planAppendImport(loadStore(), parsed.bundle));
  };

  const handleApply = () => {
    if (!bundle) return;
    const result = applyAppendImport(bundle);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(`${result.plan.willChange}件を追加しました。衝突で取り込まなかったもの: ${result.plan.conflicts}件。`);
    setLastBatch(getLastImportBatch());
    reset();
  };

  const handleUndo = () => {
    if (!window.confirm("直前の取り込みで追加した内容を取り消します。取り込み後に変えた値は消しません。よろしいですか?")) return;
    const result = undoLastAppendImport();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setMessage("直前の取り込みを取り消しました。");
    setLastBatch(getLastImportBatch());
  };

  return (
    <div className="card">
      <h2>追記インポート(検査値・薬の履歴を足す)</h2>
      <p className="field-hint">
        専用のファイルから、検査値と薬の履歴を<strong>既存の記録を消さずに</strong>足します。
        上の「復元」は全体の置き換えなので、こちらを使ってください。既に違う値がある検査値は上書きせず、
        「衝突」として一覧に出して取り込みません。記録が無い日の検査値は「検査値のみ」の記録になり、
        症状なしの記録日には数えません。取り込む前に、念のためJSONバックアップを書き出してください。
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {error && (
        <p className="field-hint" role="alert" style={{ color: "#8f1414" }}>
          {error}
        </p>
      )}
      {message && (
        <p className="field-hint" role="status">
          {message}
        </p>
      )}
      {plan && (
        <div style={{ marginTop: 12 }}>
          <p>
            追加・追記: <strong>{plan.willChange}件</strong> / 衝突: <strong>{plan.conflicts}件</strong> / 既にある:{" "}
            {plan.items.filter((i) => i.status === "same").length}件
          </p>
          <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
            <tbody>
              {plan.items.map((item, i) => (
                <tr key={i} style={{ borderTop: "1px solid #ddd" }}>
                  <td style={{ padding: "4px 6px" }}>{item.kind}</td>
                  <td style={{ padding: "4px 6px" }}>{item.label}</td>
                  <td style={{ padding: "4px 6px" }}>
                    <strong>{STATUS_LABEL[item.status]}</strong>
                    {item.detail ? ` — ${item.detail}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn-primary" disabled={plan.willChange === 0} onClick={handleApply}>
              この内容を追加する
            </button>
            <button type="button" className="btn-ghost" onClick={reset}>
              やめる
            </button>
          </div>
        </div>
      )}
      {lastBatch && !plan && (
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={handleUndo}>
            直前の取り込みを取り消す({new Date(lastBatch.at).toLocaleString("ja-JP")})
          </button>
        </div>
      )}
    </div>
  );
}
