"use client";

import { useState } from "react";
import { CareerMeta, RouteType } from "@/lib/types";

const ROUTES: { id: RouteType; label: string; emoji: string; desc: string }[] = [
  { id: "ml", label: "MLエンジニア特化", emoji: "🧠", desc: "モデルの中身にこだわる。技術力の伸びが早い。" },
  { id: "prompt", label: "プロンプトエンジニア特化", emoji: "💬", desc: "言葉でAIを操る。RAG/プロンプト系の効果が高い。" },
  { id: "mlops", label: "インフラ・MLOps特化", emoji: "⚙️", desc: "安定運用に強い。1ターンの行動回数が多い。" },
];

export default function SetupScreen({
  meta,
  onBack,
  onStart,
}: {
  meta: CareerMeta;
  onBack: () => void;
  onStart: (route: RouteType, challenge: { halfBudget: boolean; shortSprint: boolean }, ngPlusLevel: number) => void;
}) {
  const [route, setRoute] = useState<RouteType>("ml");
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>職種ルートを選ぶ</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
          ルートによって得意なアクションやエンディングが変わる。
        </p>
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {ROUTES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoute(r.id)}
              className="card"
              style={{
                textAlign: "left",
                padding: 16,
                cursor: "pointer",
                border: route === r.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: route === r.id ? "var(--accent-soft)" : "var(--bg-elevated)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {r.emoji} {r.label}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{r.desc}</div>
            </button>
          ))}
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
              <div style={{ fontWeight: 600, fontSize: 14 }}>⏱️ 1週間クリア縛り</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>最初のプロジェクトの納期がわずか1週間になる。</div>
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
