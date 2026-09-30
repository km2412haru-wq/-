"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { verifyStoreOnStartup, type StorageNotice } from "@/lib/storage";

/**
 * データ読み込み時に復旧または破損検出があった場合に、アプリ起動時
 * (全ページ共通のlayoutから1回だけ)ユーザーへ通知する。
 */
export default function RecoveryNoticeBanner() {
  const [notice, setNotice] = useState<StorageNotice | null>(null);

  useEffect(() => {
    // 開発時のStrictModeは効果を2回実行し、2回目はフラグ消費済みでnullが返る。
    // nullで上書きすると通知が消えるため、通知があった時だけ反映する
    const found = verifyStoreOnStartup();
    if (found) setNotice(found);
  }, []);

  if (!notice) return null;

  return (
    <div className="card emergency-banner" role="alert">
      {notice === "recovered" ? (
        <>
          <strong>前回のデータ保存中に問題が発生したため、直前のバックアップから復元しました。</strong>
          <p className="field-hint">
            内容に不自然な点がないか、念のためご確認ください。破損していた元のデータは端末内に
            退避してあります(バックアップ画面から書き出せます)。
          </p>
        </>
      ) : (
        <>
          <strong>保存されていたデータを読み込めず、復元できるバックアップもありませんでした。</strong>
          <p className="field-hint">
            現在は空の状態で起動しています。読み込めなかった元のデータは端末内に退避してあります。
            <Link href="/backup">バックアップ画面</Link>
            から書き出して保管し、以前のJSONバックアップがあればそこから復元してください。
            新しく記録を始めても、退避したデータは削除されません。
          </p>
        </>
      )}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setNotice(null)}
        style={{ marginTop: 8 }}
      >
        閉じる
      </button>
    </div>
  );
}
