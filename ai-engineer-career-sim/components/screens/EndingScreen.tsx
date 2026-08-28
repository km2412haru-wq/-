"use client";

import { GameState } from "@/lib/types";
import { computeEndingType, playerAge, RESIDENCE_LABEL } from "@/lib/engine/engine";
import { titleForReputation } from "@/lib/data/titles";

export default function EndingScreen({ state, onRestart, onTitle }: { state: GameState; onRestart: () => void; onTitle: () => void }) {
  const ending = computeEndingType(state);
  const title = titleForReputation(state.reputation);

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 16px 80px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 6 }}>{ending.title.split(" ")[0]}</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{ending.title.replace(/^\S+\s/, "")}</h2>
      <p style={{ color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 24 }}>{ending.desc}</p>

      <div className="card" style={{ padding: 18, textAlign: "left", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>👑 最終称号：{title.name}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
          <div>現在の年齢：{playerAge(state)}歳</div>
          <div>評価スコア：{state.reputation}</div>
          <div>転職回数：{state.jobChangeCount}回</div>
          <div>最終年収：約{state.salary}万円</div>
          <div>個人貯金：{state.personalSavings}万円</div>
          <div>住まい：{state.boughtHouse ? "🏠マイホーム" : RESIDENCE_LABEL[state.residence]}</div>
          <div>私生活：{[state.married && "💍既婚", state.hasChild && "👶子育て中", state.hasPartner && !state.married && "💑交際中"].filter(Boolean).join("・") || "特になし"}</div>
          <div>取得資格：{state.certifications.length}個</div>
          <div>完了プロジェクト：{state.totalProjectsCompleted}件</div>
          <div>失敗プロジェクト：{state.totalProjectsFailed}件</div>
          <div>解除実績：{state.unlockedAchievements.length}個</div>
        </div>
      </div>

      {state.jobHistory.length > 0 && (
        <div className="card" style={{ padding: 18, textAlign: "left", marginBottom: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>🧳 キャリア履歴</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            {[...state.jobHistory, { companyId: state.currentCompany.id, name: state.currentCompany.name, emoji: state.currentCompany.emoji, weeksWorked: state.week - state.companyStartWeek, culture: state.currentCompany.culture }].map(
              (j, i) => (
                <div key={i}>
                  {j.emoji} {j.name}（在籍{j.weeksWorked}ヶ月）
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onTitle}>
          タイトルへ戻る
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onRestart}>
          もう一周挑戦する（NG+）
        </button>
      </div>
    </div>
  );
}
