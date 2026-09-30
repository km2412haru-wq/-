"use client";

import { useMemo, useState } from "react";
import { buildQuickDraft } from "@/lib/quickLog";
import { computeSymptomChips } from "@/lib/symptomStats";
import { useMedications } from "@/lib/useMedications";
import type { DailyLogDraft } from "@/lib/useDailyLogs";
import { DANGER_SYMPTOMS, type DailyLog } from "@/types/vitalog";

interface Props {
  historyLogs: DailyLog[];
  onSubmit: (draft: DailyLogDraft) => void;
  onCancel: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 大きく押しやすいボタン(体調が悪い時でも操作できる大きさ) */
const BIG: React.CSSProperties = { minHeight: 48, minWidth: 48, fontSize: "1.05rem" };

/**
 * 低エネルギーモード(簡易入力)。体調が悪い日でも、ほぼタップだけで最低限の記録を残せる。
 * 通常入力と同じスキーマで保存され(entryMode: "quick")、あとから「詳細を追記」できる。
 * F10の主な入力(倦怠感・体温)とDanger層(危険症状)は、体調が悪い日ほど必要なので含める。
 */
export default function QuickLogForm({ historyLogs, onSubmit, onCancel }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [fatigueUnusual, setFatigueUnusual] = useState(false);
  const [hasSymptoms, setHasSymptoms] = useState<boolean | null>(null);
  const [symptomNames, setSymptomNames] = useState<string[]>([]);
  const [dangerSymptoms, setDangerSymptoms] = useState<string[]>([]);
  const [temperature, setTemperature] = useState("");

  const { registeredMedications } = useMedications();
  const { chipNames } = useMemo(() => computeSymptomChips(historyLogs), [historyLogs]);

  // 体調スコアを選ばなくても、危険症状があればその記録を残せるようにする
  const canSave = score !== null || dangerSymptoms.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const temp = temperature.trim() === "" ? undefined : Number(temperature);
    onSubmit(
      buildQuickDraft(
        {
          targetDate: todayIso(),
          conditionScore: score ?? undefined,
          fatigueUnusual,
          hasSymptoms: hasSymptoms === true,
          symptomNames,
          dangerSymptoms,
          temperature: temp !== undefined && Number.isFinite(temp) ? temp : undefined,
        },
        registeredMedications
      )
    );
  };

  return (
    <div className="card">
      <h2>今日はしんどい(簡易入力)</h2>
      <p className="field-hint">
        今日({todayIso()})の最低限だけ記録します。詳しい内容は、体調が落ち着いてから記録一覧の
        「詳細を追記」で入力できます。
      </p>

      <div className="field">
        <label>今日の体調(1=つらい 〜 10=絶好調)</label>
        <div className="row">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              type="button"
              key={n}
              className="chip"
              style={BIG}
              data-active={score === n}
              onClick={() => setScore(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label style={{ display: "block", ...BIG }}>
          <input
            type="checkbox"
            checked={fatigueUnusual}
            onChange={(e) => setFatigueUnusual(e.target.checked)}
          />{" "}
          普段と違う強い倦怠感がある
        </label>
      </div>

      <div className="field">
        <label>症状</label>
        <div className="row">
          <button
            type="button"
            className="chip"
            style={BIG}
            data-active={hasSymptoms === false}
            onClick={() => {
              setHasSymptoms(false);
              setSymptomNames([]);
            }}
          >
            なし
          </button>
          <button
            type="button"
            className="chip"
            style={BIG}
            data-active={hasSymptoms === true}
            onClick={() => setHasSymptoms(true)}
          >
            あり
          </button>
        </div>
        {hasSymptoms === true && (
          <div className="row" style={{ marginTop: 8 }}>
            {chipNames.map((name) => (
              <button
                type="button"
                key={name}
                className="chip"
                style={BIG}
                data-active={symptomNames.includes(name)}
                onClick={() =>
                  setSymptomNames((prev) =>
                    prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
                  )
                }
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label>危険な症状(当てはまるものがあれば)</label>
        {DANGER_SYMPTOMS.map((name) => (
          <label key={name} style={{ display: "block", minHeight: 40 }}>
            <input
              type="checkbox"
              checked={dangerSymptoms.includes(name)}
              onChange={(e) =>
                setDangerSymptoms((prev) =>
                  e.target.checked ? [...prev, name] : prev.filter((n) => n !== name)
                )
              }
            />{" "}
            {name}
          </label>
        ))}
      </div>

      <div className="field">
        <label htmlFor="quickTemperature">体温(℃、任意)</label>
        <input
          id="quickTemperature"
          type="number"
          step="0.1"
          min="30"
          max="43"
          inputMode="decimal"
          placeholder="測っていれば入力"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
        />
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn-primary"
          style={BIG}
          disabled={!canSave}
          onClick={handleSave}
        >
          簡易記録を保存
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          通常入力に戻る
        </button>
      </div>
      {!canSave && <p className="field-hint">体調の数字を選ぶと保存できます。</p>}
    </div>
  );
}
