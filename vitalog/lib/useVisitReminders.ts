"use client";

import { useEffect, useRef, useState } from "react";
import type { Visit } from "@/types/vitalog";

/**
 * F4-2: 次回受診予定のリマインダー通知。
 * 服薬リマインダー(useForegroundReminders)と同じ制約: アプリを開いている間だけ動作する
 * フォアグラウンド通知(真のバックグラウンドPushにはService Worker+サーバー側の
 * Push購読管理が必要でスコープ外)。
 *
 * 前日と当日の朝9時台に1回だけ通知する簡易実装。
 */
export function useVisitReminders(visits: Visit[]) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const notifiedRef = useRef<Set<string>>(new Set());

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

    const check = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 9 || hour >= 10) return; // 9時台にだけチェック(1日1回程度に抑える)

      const todayIso = now.toISOString().slice(0, 10);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString().slice(0, 10);

      for (const visit of visits) {
        if (!visit.nextVisitDate) continue;
        const key = `${todayIso}:${visit.id}`;
        if (notifiedRef.current.has(key)) continue;

        if (visit.nextVisitDate === todayIso) {
          notifiedRef.current.add(key);
          new Notification("本日、通院予定があります", {
            body: visit.hospitalName || "次回受診予定日です",
            tag: key,
          });
        } else if (visit.nextVisitDate === tomorrowIso) {
          notifiedRef.current.add(key);
          new Notification("明日、通院予定があります", {
            body: visit.hospitalName || "次回受診予定日です",
            tag: key,
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 30 * 60_000);
    return () => clearInterval(interval);
  }, [permission, visits]);

  return { permission, requestPermission };
}
