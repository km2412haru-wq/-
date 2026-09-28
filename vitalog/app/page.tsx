"use client";

import Nav from "@/components/Nav";
import DailyLogForm from "@/components/DailyLogForm";
import DailyLogList from "@/components/DailyLogList";
import EmergencyBanner from "@/components/EmergencyBanner";
import { useDailyLogs, type DailyLogDraft } from "@/lib/useDailyLogs";

export default function Home() {
  const { dailyLogs, ready, addLog, updateLog, deleteLog } = useDailyLogs();

  const handleSubmit = (draft: DailyLogDraft) => {
    const entry = addLog(draft);

    // メモの自動タグ付けは付随機能。失敗しても記録自体には影響しない
    if (entry.memo) {
      fetch("/api/tag-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: entry.memo }),
      })
        .then((res) => res.json())
        .then((data: { tags?: string[] }) => {
          if (data.tags && data.tags.length > 0) {
            updateLog(entry.id, { memoTags: data.tags });
          }
        })
        .catch(() => {
          // 通信/APIキー未設定などで失敗しても無視する
        });
    }
  };

  const handleSkip = (targetDate: string) => {
    addLog({
      targetDate,
      skipped: true,
      jointPain: [],
      moodReasonTags: [],
      activityTags: [],
      medications: [],
    });
  };

  return (
    <main>
      <h1>Vitalog</h1>
      <Nav />
      {ready && (
        <>
          <EmergencyBanner dailyLogs={dailyLogs} />
          <DailyLogForm onSubmit={handleSubmit} onSkip={handleSkip} />
          <DailyLogList dailyLogs={dailyLogs} onDelete={deleteLog} />
        </>
      )}
    </main>
  );
}
