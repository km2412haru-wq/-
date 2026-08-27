"use client";

import { useState } from "react";
import { CareerMeta, RouteType } from "@/lib/types";

export default function SetupScreen({
  meta,
  onBack,
  onStart,
}: {
  meta: CareerMeta;
  onBack: () => void;
  onStart: (route: RouteType, challenge: { halfBudget: boolean; shortSprint: boolean }, ngPlusLevel: number) => void;
}) {
  const route: RouteType = "consultant";
  const [halfBudget, setHalfBudget] = useState(false);
  const [shortSprint, setShortSprint] = useState(false);
  const maxNgPlus = Math.min(5, meta.gamesCleared);
  const [ngPlusLevel, setNgPlusLevel] = useState(0);

  return (
    <div style={{ minHeight: "100dvh", padding: "32px 20px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 640, width: "100%" }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
          ← タイトルへ戻る
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>あなたの職種</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
          このシミュレーションでは、AI導入の構想からプロジェクト推進までを担う「AIコンサルタント」としてキャリアをスタートする。
        </p>
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          <div
            className="card"
            style={{
              textAlign: "left",
              padding: 16,
              border: "2px solid var(--accent)",
              background: "var(--accent-soft)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>🧑‍💼 AIコンサルタント</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              クライアント企業へのAI導入提案から推進まで担う。コミュ力を軸に、技術力とのバランスでキャリアを築いていく。
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>チャレンジモード（任意）</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>縛りプレイでスコアを稼ぎ、専用の実績を狙おう。</p>
        <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
          <label className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={halfBudget} onChange={(e) => setHalfBudget(e.target.checked)} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>💰 予算半分縛り</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>初期予算・上限予算が半分になる。</div>
            </div>
          </label>
          <label className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={shortSprint} onChange={(e) => setShortSprint(e.target.checked)} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>⏱️ 2ヶ月クリア縛り</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>最初のプロジェクトの納期がわずか2ヶ月（1ターン）になる。</div>
            </div>
          </label>
        </div>

        {maxNgPlus > 0 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>NG+（周回プレイ）</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
              過去のクリア回数に応じて周回に挑戦できる。予算が縮小しAPI価格が高騰する代わりに、初期評価スコアにボーナスが付く。
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {Array.from({ length: maxNgPlus + 1 }, (_, i) => i).map((lv) => (
                <button
                  key={lv}
                  className="btn"
                  onClick={() => setNgPlusLevel(lv)}
                  style={{ borderColor: ngPlusLevel === lv ? "var(--accent)" : undefined, fontWeight: ngPlusLevel === lv ? 800 : 600 }}
                >
                  {lv === 0 ? "通常" : `NG+${lv}`}
                </button>
              ))}
            </div>
          </>
        )}

        <button className="btn btn-primary btn-block" style={{ padding: 14, fontSize: 16 }} onClick={() => onStart(route, { halfBudget, shortSprint }, ngPlusLevel)}>
          このキャリアで始める ▶
        </button>
      </div>
    </div>
  );
}
