"use client";

import { useEffect, useState } from "react";
import { isStoreNewerThanApp, STORE_READONLY_EVENT } from "@/lib/storage";

/**
 * 保存されているデータが、この画面(アプリ)より新しい版で作られている場合に、保存を止めたことを知らせる。
 * 古い画面が開いたままのPWAや、別の端末で作った新しいデータを古い画面で開いた時に、
 * 新しい版が足した項目を古い画面の保存で消してしまわないための保護。layoutに置く。
 */
export default function StoreReadOnlyBanner() {
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    setReadOnly(isStoreNewerThanApp());
    const onReadOnly = () => setReadOnly(true);
    window.addEventListener(STORE_READONLY_EVENT, onReadOnly);
    return () => window.removeEventListener(STORE_READONLY_EVENT, onReadOnly);
  }, []);

  if (!readOnly) return null;

  return (
    <div className="card emergency-banner" role="alert">
      <strong>この画面は古い版のため、保存を止めています。</strong>
      <p className="field-hint">
        保存されているデータは、より新しい版のアプリで作られています。このまま保存すると、新しい項目が
        失われる恐れがあります。入力した内容は保存されません。アプリを完全に閉じて開き直す(または再読み込みする)と、
        最新の版になります。
      </p>
      <button
        type="button"
        className="btn-primary"
        onClick={() => window.location.reload()}
        style={{ marginTop: 8 }}
      >
        再読み込み
      </button>
    </div>
  );
}
