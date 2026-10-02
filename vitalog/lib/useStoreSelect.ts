"use client";

import { useCallback, useEffect, useState } from "react";
import { getStorageKey, loadStore, STORE_CHANGED_EVENT } from "@/lib/storage";
import type { VitalogStore } from "@/types/vitalog";

/**
 * ストアの一部を画面に映すフック。保存されているデータの「写し」であり、自分では保存しない
 * (変更はupdateStore経由。lib/storeOps.ts参照)。次のとき、保存されている最新を読み直す:
 *   - マウント時
 *   - 同じタブでupdateStoreなどが成功した時(STORE_CHANGED_EVENT)
 *   - 別のタブが本データを書き換えた時(storageイベント)
 * `select`はモジュール直下の関数など、参照が変わらないものを渡すこと。
 */
export function useStoreSelect<T>(select: (store: VitalogStore) => T, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setValue(select(loadStore()));
  }, [select]);

  useEffect(() => {
    refresh();
    setReady(true);
    const key = getStorageKey();
    const onStorage = (e: StorageEvent) => {
      // 本データキーの変更、または全消去(key === null)のとき
      if (e.key === key || e.key === null) refresh();
    };
    window.addEventListener(STORE_CHANGED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STORE_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { value, ready };
}
