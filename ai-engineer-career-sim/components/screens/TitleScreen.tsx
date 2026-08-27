"use client";

import { CareerMeta } from "@/lib/types";
import { xpForNextLevel } from "@/lib/storage";
import { ACHIEVEMENTS } from "@/lib/data/achievements";

export default function TitleScreen({
  meta,
  onStart,
  onAchievements,
  onRanking,
  onCodex,
}: {
  meta: CareerMeta;
  onStart: () => void;
  onAchievements: () => void;
  onRanking: () => void;
  onCodex: () => void;
}) {
  const unlockedCount = meta.unlockedAchievementsGlobal.length;
  const pct = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🌱🤖</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>駆け出しAIエンジニア物語</h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 28px", lineHeight: 1.7 }}>
          シード期スタートアップから始まる、AIエンジニアのキャリア・シミュレーション。
          <br />
          限られた工数と予算をやりくりし、実績を積んでキャリアを切り拓こう。
        </p>

        <div className="card" style={{ padding: "16px 18px", marginBottom: 16, textAlign: "left" }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🔰 あそびかた（専門知識は不要です）</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
            <li>毎週、リストから行動を選ぶ（例：「休む」「チームに相談する」など）だけでOK</li>
            <li>行動を選ぶと「技術力」「コミュ力」などの数値が育っていく</li>
            <li>育てた数値がそのまま面接の実力になり、憧れの企業にも挑戦できる</li>
            <li>納期までに製品を完成させながら、キャリアを自由に切り拓こう</li>
          </ol>
        </div>

        <div className="card" style={{ padding: "16px 18px", marginBottom: 20, textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
            <span>
              プレイヤーレベル <b>{meta.playerLevel}</b>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {meta.playerXp} / {xpForNextLevel(meta.playerLevel)} XP
            </span>
          </div>
          <div className="gauge-track" style={{ marginBottom: 10 }}>
            <div className="gauge-fill" style={{ width: `${(meta.playerXp / xpForNextLevel(meta.playerLevel)) * 100}%`, background: "var(--accent)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
            <span>実績コンプ率</span>
            <span>
              {unlockedCount} / {ACHIEVEMENTS.length}（{pct}%）
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary btn-block" style={{ padding: "14px", fontSize: 16 }} onClick={onStart}>
            ▶ ニューゲーム
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={onAchievements}>
              🏅 実績
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={onCodex}>
              📖 図鑑
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={onRanking}>
              🏆 ランキング
            </button>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 28, lineHeight: 1.6 }}>
          ※ 登場する企業名は実在の企業から着想を得ていますが、難易度・選考プロセス・演出はすべてゲーム的な脚色であり、
          各社の実際の採用基準・選考フロー・内部情報を正確に再現するものではありません。
        </p>
      </div>
    </div>
  );
}
