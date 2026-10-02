"use client";

import { useState } from "react";
import { useHypotheses } from "@/lib/useHypotheses";
import { useSelfExperiments } from "@/lib/useSelfExperiments";
import { useDailyLogs } from "@/lib/useDailyLogs";
import { compareExperiment } from "@/lib/selfExperimentAnalysis";
import { localTodayIso } from "@/lib/dateUtil";

function todayIso(): string {
  return localTodayIso();
}

export default function ExperimentsManager() {
  const { hypotheses, ready: hypoReady, addHypothesis, deleteHypothesis } = useHypotheses();
  const {
    selfExperiments,
    ready: expReady,
    addExperiment,
    endExperiment,
    deleteExperiment,
  } = useSelfExperiments();
  const { dailyLogs } = useDailyLogs();

  const [statement, setStatement] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayIso());

  if (!hypoReady || !expReady) return null;

  const handleAddHypothesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) return;
    if (!addHypothesis(statement.trim())) return;
    setStatement("");
  };

  const handleAddExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    if (!addExperiment(description.trim(), startDate)) return;
    setDescription("");
    setStartDate(todayIso());
  };

  return (
    <>
      <div className="card">
        <h2>F12-1: 仮説検証フレームワーク</h2>
        <p className="field-hint">
          「気圧低下を3日後に関節痛」のような仮説を登録しておきます。統計的な支持率の自動算出は
          相関分析(F5/F11)の実装後です。今はデータを見返す際のチェックリストとして使えます。
        </p>
        {hypotheses.length === 0 && <p className="muted">まだ仮説がありません</p>}
        {hypotheses.map((h) => (
          <div key={h.id} className="log-entry">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>{h.statement}</span>
              <button type="button" className="btn-ghost" onClick={() => deleteHypothesis(h.id)}>
                削除
              </button>
            </div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              登録日: {h.createdAt.slice(0, 10)}
            </div>
          </div>
        ))}
        <form onSubmit={handleAddHypothesis} style={{ marginTop: 12 }}>
          <div className="row">
            <input
              type="text"
              placeholder="例: 気圧が3hPa以上下がると2〜3日後に関節痛が悪化する"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-secondary">
              ＋ 追加
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>F12-2: セルフA/Bテストログ</h2>
        <p className="field-hint">
          「今週は睡眠を20分増やす」等の介入期間を宣言し、開始前の同じ日数分と比較した
          体調スコアの平均を表示します(厳密な統計検定ではなく、ざっくりした目安です)。
        </p>
        {selfExperiments.length === 0 && <p className="muted">まだ実験がありません</p>}
        {selfExperiments.map((exp) => {
          const cmp = compareExperiment(dailyLogs, exp);
          return (
            <div key={exp.id} className="log-entry">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{exp.description}</strong>
                <button type="button" className="btn-ghost" onClick={() => deleteExperiment(exp.id)}>
                  削除
                </button>
              </div>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                期間: {exp.startDate} 〜 {exp.endDate ?? "進行中"}
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <span className="tag">
                  介入前平均: {cmp.beforeAvg ?? "-"} ({cmp.beforeCount}日分)
                </span>
                <span className="tag">
                  介入中平均: {cmp.duringAvg ?? "-"} ({cmp.duringCount}日分)
                </span>
              </div>
              {!exp.endDate && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => endExperiment(exp.id, todayIso())}
                >
                  今日で終了にする
                </button>
              )}
            </div>
          );
        })}
        <form onSubmit={handleAddExperiment} style={{ marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="例: 睡眠を20分増やす"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary">
            ＋ 実験を開始
          </button>
        </form>
      </div>
    </>
  );
}
