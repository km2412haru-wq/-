"use client";

import { useState } from "react";
import {
  downloadBackupFromDrive,
  isGoogleDriveConfigured,
  requestAccessToken,
  uploadBackupToDrive,
} from "@/lib/googleDrive";
import { exportStoreAsJson, importStoreFromJson } from "@/lib/storage";

export default function GoogleDriveBackup() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isGoogleDriveConfigured()) {
    return (
      <div className="card">
        <h2>Google Driveへのバックアップ</h2>
        <p className="field-hint">
          未設定です。Google Cloud ConsoleでOAuthクライアントIDを発行し、
          <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>を設定すると使えるようになります
          (手順はREADME参照)。未設定でも他の機能(手動エクスポート等)は問題なく使えます。
        </p>
      </div>
    );
  }

  const handleBackup = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const token = await requestAccessToken();
      await uploadBackupToDrive(token, exportStoreAsJson());
      setMessage("Google Driveへのバックアップが完了しました。");
    } catch (err) {
      console.error(err);
      setMessage("バックアップに失敗しました。時間をおいて再試行してください。");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm("Google Drive上のバックアップで現在のデータを上書きします。よろしいですか?")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const token = await requestAccessToken();
      const json = await downloadBackupFromDrive(token);
      importStoreFromJson(json);
      setMessage("復元が完了しました。ページを再読み込みします。");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      setMessage("復元に失敗しました。Google Drive上にバックアップがあるか確認してください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Google Driveへのバックアップ</h2>
      <p className="field-hint">
        このアプリ専用の隠しフォルダ(appDataFolder)に、日付付きのファイル名(例:
        vitalog-backup-2026-09-28.json)でバックアップを保存します。直近5世代だけ残し、
        古いものは自動削除されます。あなたのDrive上の他のファイルには一切アクセスしません。
        復元前には現在のデータが1世代だけ自動退避されるので、誤って古い世代を復元しても
        バックアップ画面から直前の状態に戻せます。
      </p>
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn-secondary" onClick={handleBackup} disabled={busy}>
          ☁️ Google Driveにバックアップ
        </button>
        <button type="button" className="btn-secondary" onClick={handleRestore} disabled={busy}>
          ☁️ Google Driveから復元
        </button>
      </div>
      {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
    </div>
  );
}
