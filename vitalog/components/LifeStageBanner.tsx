"use client";

import { isInLifeStageTransitionWindow, LIFE_STAGE_TRANSITION_DATE } from "@/lib/lifeStage";

export default function LifeStageBanner() {
  if (!isInLifeStageTransitionWindow()) return null;

  return (
    <div className="card" style={{ borderColor: "var(--color-primary)" }}>
      <strong>📅 ライフステージ移行の要注意期間中です</strong>
      <p className="field-hint">
        {LIFE_STAGE_TRANSITION_DATE}前後(就業形態の変化)は、生活リズムの変化で症状が
        再燃しやすい時期として設定されています。F10の緊急検知は通常より敏感な閾値で動作します。
      </p>
    </div>
  );
}
