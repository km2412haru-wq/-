/**
 * F8残り: Google Driveへの手動/オンデマンドバックアップ。
 *
 * OAuth(Google Identity Services)でアクセストークンを取得し、Drive APIの
 * appDataFolder(そのアプリ専用の隠しフォルダ、ユーザーの他のDriveファイルには
 * 一切アクセスしないスコープ)にJSONバックアップを保存/復元する。
 * サーバーは経由しない(トークン取得もアップロードも全部ブラウザ内で完結)。
 *
 * 世代管理: 単一ファイルへの無条件上書きは、誤って壊れたデータで上書きされる
 * リスクがあるため、日付付きファイル名(vitalog-backup-YYYY-MM-DD.json)で
 * 毎回新規ファイルとして保存し、直近5世代だけを残して古いものは削除する。
 *
 * 利用にはGoogle Cloud ConsoleでOAuthクライアントIDを発行し、
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID として設定する必要がある(README参照)。
 * 未設定の場合はこの機能全体を無効表示にする。
 */

const BACKUP_FILE_PREFIX = "vitalog-backup-";
const MAX_GENERATIONS = 5;
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }): { requestAccessToken: () => void };
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("ブラウザ環境ではありません"));
      return;
    }
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google認証スクリプトの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

export async function requestAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_IDが設定されていません");

  await loadGisScript();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google認証の初期化に失敗しました"));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? "アクセストークンの取得に失敗しました"));
          return;
        }
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

async function listBackupFiles(token: string): Promise<DriveFile[]> {
  const url =
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder` +
    `&q=name contains '${BACKUP_FILE_PREFIX}'` +
    `&fields=files(id,name,createdTime)&orderBy=createdTime desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Google Driveの検索に失敗しました");
  const data = await res.json();
  return (data.files ?? []) as DriveFile[];
}

async function deleteFile(token: string, fileId: string): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function uploadBackupToDrive(token: string, json: string): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${BACKUP_FILE_PREFIX}${dateStr}.json`;

  const boundary = "vitalog-backup-boundary";
  const metadata = { name: fileName, parents: ["appDataFolder"] };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${json}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) throw new Error("Google Driveへのアップロードに失敗しました");

  // 直近MAX_GENERATIONS世代だけ残し、古いバックアップは削除する
  const files = await listBackupFiles(token);
  const stale = files.slice(MAX_GENERATIONS);
  for (const f of stale) {
    await deleteFile(token, f.id);
  }
}

export async function downloadBackupFromDrive(token: string): Promise<string> {
  const files = await listBackupFiles(token);
  const latest = files[0];
  if (!latest) throw new Error("Google Drive上にバックアップが見つかりませんでした");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${latest.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Google Driveからの復元に失敗しました");
  return res.text();
}

/** バックアップ管理画面で世代一覧を表示するために使う */
export async function listDriveBackups(token: string): Promise<DriveFile[]> {
  return listBackupFiles(token);
}
