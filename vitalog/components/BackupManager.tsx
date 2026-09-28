"use client";

import { useRef, useState } from "react";
import { downloadCsvBackup, downloadJsonBackup, restoreFromJsonFile } from "@/lib/exportImport";
import GoogleDriveBackup from "@/components/GoogleDriveBackup";

export default function BackupManager() {
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRestore = async (file: File | null) => {
    if (!file) return;
    try {
      await restoreFromJsonFile(file);
      setMessage("復元が完了しました。ページを再読み込みします。");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      setMessage("復元に失敗しました。ファイルが破損している可能性があります。");
    }
  };

  return (
    <>
      <div className="card">
        <h2>エクスポート</h2>
        <p className="field-hint">
          記録データを端末にダウンロードします。データはこのブラウザのlocalStorageにのみ
          保存されているため、端末の紛失・アプリの再インストール前に定期的にバックアップしてください。
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={downloadJsonBackup}>
            JSONでダウンロード(完全なバックアップ)
          </button>
          <button type="button" className="btn-secondary" onClick={downloadCsvBackup}>
            CSVでダウンロード(表計算・医師向け共有用)
          </button>
        </div>
      </div>

      <div className="card">
        <h2>復元(インポート)</h2>
        <p className="field-hint">
          以前ダウンロードしたJSONバックアップから復元します。現在のデータは上書きされます。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => handleRestore(e.target.files?.[0] ?? null)}
        />
        {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
      </div>

      <GoogleDriveBackup />
    </>
  );
}
