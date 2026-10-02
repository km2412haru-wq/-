"use client";

import { useEffect, useRef, useState } from "react";
import { downloadCsvBackup, downloadJsonBackup, restoreFromJsonFile } from "@/lib/exportImport";
import {
  clearCorruptSnapshot,
  getCorruptSnapshot,
  hasPreRestoreSnapshot,
  loadStore,
  restorePreRestoreSnapshot,
} from "@/lib/storage";
import GoogleDriveBackup from "@/components/GoogleDriveBackup";
import { localTodayIso } from "@/lib/dateUtil";

export default function BackupManager() {
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCorruptSnapshot, setHasCorruptSnapshot] = useState(false);

  // 破損データの退避は、データを読み込んだ時に作られる。描画時に確認すると、起動時の
  // 整合性チェック(RecoveryNoticeBanner)より先に描画されて見落とすため、マウント後に確認する
  useEffect(() => {
    loadStore();
    setHasCorruptSnapshot(getCorruptSnapshot() !== null);
  }, []);

  const handleRestore = async (file: File | null) => {
    if (!file) return;
    if (
      !window.confirm(
        "現在のデータは、このファイルの内容で上書きされます。よろしいですか?(直前の状態には1回だけ戻せます)"
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      await restoreFromJsonFile(file);
      setMessage("復元が完了しました。ページを再読み込みします。");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      setMessage("復元に失敗しました。ファイルが破損している可能性があります。");
    }
  };

  const handleDownloadCorrupt = () => {
    const raw = getCorruptSnapshot();
    if (!raw) return;
    const blob = new Blob([raw], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitalog-corrupt-data-${localTodayIso()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDiscardCorrupt = () => {
    if (!window.confirm("退避してある破損データを削除します。書き出していない場合は二度と取り戻せません。よろしいですか?")) return;
    clearCorruptSnapshot();
    window.location.reload();
  };

  const handleUndoRestore = () => {
    if (!window.confirm("直前の復元操作の前の状態に戻します。よろしいですか?")) return;
    restorePreRestoreSnapshot();
    setMessage("直前の状態に戻しました。ページを再読み込みします。");
    setTimeout(() => window.location.reload(), 1200);
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
          以前ダウンロードしたJSONバックアップから復元します。現在のデータは上書きされますが、
          実行直前の状態は1世代だけ自動的に退避されるので、誤操作した場合は下のボタンで戻せます。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => handleRestore(e.target.files?.[0] ?? null)}
        />
        {hasPreRestoreSnapshot() && (
          <button
            type="button"
            className="btn-ghost"
            style={{ marginTop: 8, display: "block" }}
            onClick={handleUndoRestore}
          >
            ↩ 直前の復元操作を取り消す(1回のみ)
          </button>
        )}
        {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
      </div>

      {hasCorruptSnapshot && (
        <div className="card emergency-banner">
          <h2>破損したデータの退避</h2>
          <p className="field-hint">
            保存データが壊れて読み込めなかった時に、元のテキストをそのまま端末内に退避してあります。
            自動では削除されません。書き出して保管しておけば、あとから手作業で救出できる場合があります。
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={handleDownloadCorrupt}>
              退避データを書き出す
            </button>
            <button type="button" className="btn-ghost" onClick={handleDiscardCorrupt}>
              退避データを削除
            </button>
          </div>
        </div>
      )}

      <GoogleDriveBackup />
    </>
  );
}
