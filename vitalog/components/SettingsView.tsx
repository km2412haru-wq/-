"use client";

import { useState } from "react";
import {
  clearLifeStageDateOverride,
  loadLifeStageDateOverride,
  saveLifeStageDateOverride,
} from "@/lib/settings";
import { LIFE_STAGE_TRANSITION_DATE_DEFAULT } from "@/lib/lifeStage";

export default function SettingsView() {
  const [lifeStageDate, setLifeStageDate] = useState(
    () => loadLifeStageDateOverride() ?? LIFE_STAGE_TRANSITION_DATE_DEFAULT
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveLifeStageDateOverride(lifeStageDate);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    clearLifeStageDateOverride();
    setLifeStageDate(LIFE_STAGE_TRANSITION_DATE_DEFAULT);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card">
      <h2>F12-4: ライフステージ移行日の設定</h2>
      <p className="field-hint">
        この日付の前後90日間が「要注意期間」として自動フラグされ、F10の緊急検知の閾値が
        敏感になります(既定値は2027年のAmazon Japan入社を想定した2027-04-01)。
      </p>
      <div className="field">
        <label htmlFor="lifeStageDate">移行日</label>
        <input
          id="lifeStageDate"
          type="date"
          value={lifeStageDate}
          onChange={(e) => setLifeStageDate(e.target.value)}
        />
      </div>
      <div className="row">
        <button type="button" className="btn-primary" onClick={handleSave}>
          保存
        </button>
        <button type="button" className="btn-ghost" onClick={handleReset}>
          既定値に戻す
        </button>
      </div>
      {saved && <p className="muted" style={{ marginTop: 8 }}>保存しました。</p>}
    </div>
  );
}
