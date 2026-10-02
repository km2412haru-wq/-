"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import DailyLogForm from "@/components/DailyLogForm";
import DailyLogList from "@/components/DailyLogList";
import DangerBanner from "@/components/DangerBanner";
import EmergencyBanner from "@/components/EmergencyBanner";
import LifeStageBanner from "@/components/LifeStageBanner";
import QuickLogForm from "@/components/QuickLogForm";
import { mergeAppendedLog } from "@/lib/quickLog";
import { useDailyLogs, type DailyLogDraft } from "@/lib/useDailyLogs";
import type { DailyLog } from "@/types/vitalog";

export default function Home() {
  const { dailyLogs, ready, addLog, updateLog, deleteLog } = useDailyLogs();
  const [quickMode, setQuickMode] = useState(false);
  const [appendTarget, setAppendTarget] = useState<DailyLog | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // PWAのホーム画面ショートカット(/?mode=quick)から起動した場合は、最初から簡易入力にする
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "quick") setQuickMode(true);
  }, []);

  const tagMemo = (logId: string, memo: string | undefined) => {
    // メモの自動タグ付けは付随機能。失敗しても記録自体には影響しない
    if (!memo) return;
    fetch("/api/tag-memo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo }),
    })
      .then((res) => res.json())
      .then((data: { tags?: string[] }) => {
        if (data.tags && data.tags.length > 0) {
          updateLog(logId, { memoTags: data.tags });
        }
      })
      .catch(() => {
        // 通信/APIキー未設定などで失敗しても無視する
      });
  };

  // 保存できたかを返す(失敗時はフォームの入力を残し、成功の表示も出さない)
  const handleSubmit = (draft: DailyLogDraft): boolean => {
    if (appendTarget) {
      if (!updateLog(appendTarget.id, mergeAppendedLog(appendTarget, draft))) return false;
      tagMemo(appendTarget.id, draft.memo);
      setAppendTarget(null);
      setNotice(`${appendTarget.targetDate}の記録に詳細を追記しました。`);
      return true;
    }
    const entry = addLog(draft);
    if (!entry) return false;
    tagMemo(entry.id, entry.memo);
    return true;
  };

  const handleQuickSubmit = (draft: DailyLogDraft): boolean => {
    if (!addLog(draft)) return false;
    setQuickMode(false);
    setNotice(
      "簡易記録を保存しました。体調が落ち着いたら、記録履歴の「詳細を追記」から続きを入力できます。"
    );
    return true;
  };

  const handleAppend = (log: DailyLog) => {
    setAppendTarget(log);
    setQuickMode(false);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSkip = (targetDate: string) => {
    addLog({
      targetDate,
      skipped: true,
      jointPain: [],
      symptoms: [],
      dangerSymptoms: [],
      moodReasonTags: [],
      activityTags: [],
      medications: [],
      topicalMedications: [],
    });
  };

  return (
    <main>
      <h1>Vitalog</h1>
      <Nav />
      {ready && (
        <>
          <DangerBanner dailyLogs={dailyLogs} />
          <EmergencyBanner dailyLogs={dailyLogs} />
          <LifeStageBanner />
          {notice && (
            <div className="card status-note" role="status">
              {notice}{" "}
              <button type="button" className="btn-ghost" onClick={() => setNotice(null)}>
                閉じる
              </button>
            </div>
          )}
          {quickMode ? (
            <QuickLogForm
              historyLogs={dailyLogs}
              onSubmit={handleQuickSubmit}
              onCancel={() => setQuickMode(false)}
            />
          ) : (
            <>
              {!appendTarget && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", minHeight: 52, fontSize: "1.05rem", marginBottom: 12 }}
                  onClick={() => {
                    setQuickMode(true);
                    setNotice(null);
                  }}
                >
                  😣 今日はしんどい(簡易入力)
                </button>
              )}
              <DailyLogForm
                onSubmit={handleSubmit}
                onSkip={handleSkip}
                appendTo={appendTarget}
                onCancelAppend={() => setAppendTarget(null)}
              />
            </>
          )}
          <DailyLogList dailyLogs={dailyLogs} onDelete={deleteLog} onAppend={handleAppend} />
        </>
      )}
    </main>
  );
}
