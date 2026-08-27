"use client";

import type { Company } from "@/lib/types";
import { battle, computeBattleScore } from "@/lib/battle";
import { cardCode } from "@/lib/cardCode";
import { getRarity } from "@/lib/rarity";

function StatBar({ label, a, b, unit }: { label: string; a: number; b: number; unit: string }) {
  const max = Math.max(a, b, 1);
  return (
    <div className="battleStatRow">
      <span className="battleStatLabel">{label}</span>
      <div className="battleStatBars">
        <div className="battleBarTrack battleBarTrackA">
          <div className="battleBarFill" style={{ width: `${(Math.max(a, 0) / max) * 100}%` }} />
        </div>
        <div className="battleBarTrack battleBarTrackB">
          <div className="battleBarFill" style={{ width: `${(Math.max(b, 0) / max) * 100}%` }} />
        </div>
      </div>
      <div className="battleStatValues">
        <span>
          {a}
          {unit}
        </span>
        <span>
          {b}
          {unit}
        </span>
      </div>
    </div>
  );
}

export default function BattleModal({
  a,
  b,
  onClose,
}: {
  a: Company;
  b: Company;
  onClose: () => void;
}) {
  const result = battle(a, b);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="battleModal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modalClose" onClick={onClose} aria-label="閉じる">
          ✕
        </button>

        <h2 className="battleTitle">⚔️ カードバトル</h2>

        <div className="battleHeader">
          <div className="battleSide" style={{ background: `linear-gradient(150deg, ${a.colors[0]}, ${a.colors[1]})` }}>
            <span className="battleCode">{cardCode(a.name)}</span>
            <span className="battleName">{a.nameJa}</span>
            <span className="battleRarity">{getRarity(a.revenueUsdB)}</span>
          </div>
          <span className="battleVs">VS</span>
          <div className="battleSide" style={{ background: `linear-gradient(150deg, ${b.colors[0]}, ${b.colors[1]})` }}>
            <span className="battleCode">{cardCode(b.name)}</span>
            <span className="battleName">{b.nameJa}</span>
            <span className="battleRarity">{getRarity(b.revenueUsdB)}</span>
          </div>
        </div>

        <div className="battleStats">
          <StatBar label="売上高目安" a={a.revenueUsdB} b={b.revenueUsdB} unit="B$" />
          <StatBar label="営業利益率目安" a={a.operatingMarginPct} b={b.operatingMarginPct} unit="%" />
          <StatBar label="総合力スコア" a={computeBattleScore(a)} b={computeBattleScore(b)} unit="" />
        </div>

        <div className="battleResult">
          {result.winnerId === null ? (
            <p>🤝 引き分け！ 規模も稼ぐ力も互角のライバル同士。</p>
          ) : (
            <p>
              🏆 <strong>{(result.winnerId === a.id ? a : b).nameJa}</strong> の勝利！
              （総合力 {Math.max(result.scoreA, result.scoreB)} vs {Math.min(result.scoreA, result.scoreB)}）
            </p>
          )}
          <p className="battleDisclaimer">
            ※「総合力」は売上規模・利益率・レア度から計算した遊び用の指標です。企業の優劣を評価するものではありません。
          </p>
        </div>
      </div>
    </div>
  );
}
