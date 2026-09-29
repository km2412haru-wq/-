"use client";

import { useEffect, useState } from "react";
import { getStorageKey } from "@/lib/storage";

/**
 * 複数タブ同時編集の競合対策。
 * 別タブで本データ(vitalog:store)が更新されると、このタブが保持している内容は
 * 古くなり、このタブで保存すると別タブの変更を上書きしてしまう恐れがある。
 *
 * storageイベントは「変更を起こしたタブ以外」で発火するため、これで他タブの更新を検知する。
 * ただし自動リロードはしない — 記入途中の毎日の記録フォーム等を失う方がリスクが高いため、
 * ユーザーに通知した上で、再読み込みするかどうかは本人に委ねる。
 */
export default function StoreSyncBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = getStorageKey();
    const onStorage = (e: StorageEvent) => {
      // 本データキーが他タブで書き換わった時のみ(削除や他キーは無視)
      if (e.key === key && e.newValue !== null) setShow(true);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!show) return null;

  return (
    <div className="card emergency-banner" role="alert">
      <strong>別のタブでデータが更新されました。</strong>
      <p className="field-hint">
        この画面の内容は古い可能性があります。この画面のまま保存すると、別タブでの変更を
        上書きしてしまう恐れがあります。記入途中の内容がなければ、再読み込みして最新の状態に
        してください。
      </p>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          再読み込み
        </button>
        <button type="button" className="btn-secondary" onClick={() => setShow(false)}>
          あとで
        </button>
      </div>
    </div>
  );
}
