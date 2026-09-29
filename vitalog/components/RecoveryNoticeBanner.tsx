"use client";

import { useEffect, useState } from "react";
import { consumeRecoveryNotice } from "@/lib/storage";

/**
 * 直前のデータ読み込みでバックアップからの自動復旧が発生していた場合に、
 * アプリ起動時(全ページ共通のlayoutから1回だけ)ユーザーへ通知する。
 */
export default function RecoveryNoticeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (consumeRecoveryNotice()) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="card emergency-banner" role="alert">
      <strong>前回のデータ保存中に問題が発生したため、直前のバックアップから復元しました。</strong>
      <p className="field-hint">内容に不自然な点がないか、念のためご確認ください。</p>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setShow(false)}
        style={{ marginTop: 8 }}
      >
        閉じる
      </button>
    </div>
  );
}
