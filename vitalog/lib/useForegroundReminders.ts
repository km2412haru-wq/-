"use client";

import { useEffect, useRef, useState } from "react";
import type { RegisteredMedication } from "@/types/vitalog";

/**
 * F2: 服薬リマインダー通知。
 *
 * 重要な制約: これは「アプリを開いている間」だけ動くフォアグラウンド通知。
 * 真のバックグラウンドPush通知(アプリを閉じていても届く)にはService Worker+
 * サーバー側のPush購読管理が必要で、今回のスコープ(サーバーレス構成)には含めていない。
 * 将来AWS移行(SNS)時に本格的なPush通知として実装する候補。
 */
export function useForegroundReminders(medications: RegisteredMedication[]) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const notifiedTodayRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    if (permission !== "granted") return;

    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      const todayKey = now.toISOString().slice(0, 10);

      for (const med of medications) {
        if (!med.active || !med.reminderTime) continue;
        const key = `${todayKey}:${med.id}`;
        if (med.reminderTime === hhmm && !notifiedTodayRef.current.has(key)) {
          notifiedTodayRef.current.add(key);
          new Notification("お薬の時間です", {
            body: `${med.name}${med.dose ? `(${med.dose})` : ""}`,
            tag: key,
          });
        }
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [permission, medications]);

  return { permission, requestPermission };
}
