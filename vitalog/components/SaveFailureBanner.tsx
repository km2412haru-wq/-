"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SAVE_FAILED_EVENT } from "@/lib/storage";

/**
 * データの保存に失敗した時に通知する(全ページ共通のlayoutに置く)。
 * 保存に失敗しても画面上は入力済みの内容が見えているため、何も出さないと
 * 「保存された」と誤解したまま記録が失われる。
 */
export default function SaveFailureBanner() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onFailed = () => setFailed(true);
    window.addEventListener(SAVE_FAILED_EVENT, onFailed);
    return () => window.removeEventListener(SAVE_FAILED_EVENT, onFailed);
  }, []);

  if (!failed) return null;

  return (
    <div className="card emergency-banner" role="alert">
      <strong>データを保存できませんでした。</strong>
      <p className="field-hint">
        直前の入力は端末に保存されていません。この端末の保存容量が不足している可能性があります。
        このページを閉じる前に、<Link href="/backup">バックアップ画面</Link>
        から既存のデータをJSONで書き出してください。
      </p>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setFailed(false)}
        style={{ marginTop: 8 }}
      >
        閉じる
      </button>
    </div>
  );
}
