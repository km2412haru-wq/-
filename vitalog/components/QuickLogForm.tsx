"use client";

import { useMemo, useState } from "react";
import { buildQuickDraft } from "@/lib/quickLog";
import { evaluateQuickGuidance, recentMeasuredTemperature, type QuickGuidance } from "@/lib/quickCheck";
import { computeSymptomChips } from "@/lib/symptomStats";
import { useMedications } from "@/lib/useMedications";
import type { DailyLogDraft } from "@/lib/useDailyLogs";
import { DANGER_SYMPTOMS, type DailyLog } from "@/types/vitalog";
import { localTodayIso } from "@/lib/dateUtil";

interface Props {
  historyLogs: DailyLog[];
  onSubmit: (draft: DailyLogDraft) => boolean;
  /** 「保存して詳細を追記する」(案内で選ばれた時)。保存できたらtrue */
  onSubmitAndAppend?: (draft: DailyLogDraft) => boolean;
  onCancel: () => void;
  /**
   * "tired": 今日はしんどい(体調スコアが必須。従来の簡易入力)
   * "noProblem": 今日は問題なし(体調スコアは任意。保存前に「いつもと違う」案内を出すことがある)
   * どちらも同じ形式(entryMode: "quick")で保存し、新しい記録種別は作らない。
   */
  variant?: "tired" | "noProblem";
}

function todayIso(): string {
  return localTodayIso();
}

/** 大きく押しやすいボタン(体調が悪い時でも操作できる大きさ) */
const BIG: React.CSSProperties = { minHeight: 48, minWidth: 48, fontSize: "1.05rem" };

/**
 * 低エネルギーモード(簡易入力)。体調が悪い日でも、ほぼタップだけで最低限の記録を残せる。
 * 通常入力と同じスキーマで保存され(entryMode: "quick")、あとから「詳細を追記」できる。
 * F10の主な入力(倦怠感・体温)とDanger層(危険症状)は、体調が悪い日ほど必要なので含める。
 */
export default function QuickLogForm({ historyLogs, onSubmit, onSubmitAndAppend, onCancel, variant = "tired" }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [fatigueUnusual, setFatigueUnusual] = useState(false);
  const [hasSymptoms, setHasSymptoms] = useState<boolean | null>(null);
  const [symptomNames, setSymptomNames] = useState<string[]>([]);
  const [dangerSymptoms, setDangerSymptoms] = useState<string[]>([]);
  const [temperature, setTemperature] = useState("");

  const [guidance, setGuidance] = useState<{ result: QuickGuidance; draft: DailyLogDraft } | null>(null);
  const noProblem = variant === "noProblem";

  const { registeredMedications } = useMedications();
  const { chipNames } = useMemo(() => computeSymptomChips(historyLogs), [historyLogs]);

  // 体調スコアを選ばなくても、危険症状があればその記録を残せるようにする。
  // 「今日は問題なし」は体調スコアを任意にする(体温・倦怠感・危険症状の確認だけで保存できる)
  const canSave = noProblem || score !== null || dangerSymptoms.length > 0;
  // 前回の体温は参考表示だけにする。入力欄には入れない(測っていない日に前回の値が今日の測定になるのを防ぐ)
  const lastTemperature = useMemo(() => recentMeasuredTemperature(historyLogs, todayIso()), [historyLogs]);

  const handleSave = () => {
    if (!canSave) return;
    const temp = temperature.trim() === "" ? undefined : Number(temperature);
    const input = {
      targetDate: todayIso(),
      conditionScore: score ?? undefined,
      fatigueUnusual,
      // 「今日は問題なし」では症状は聞かない(押した=症状なしの申告)。聞いていない関節痛・皮疹・睡眠は
      // 簡易記録の扱い(「なし」の根拠にしない)のまま
      hasSymptoms: noProblem ? false : hasSymptoms === true,
      symptomNames: noProblem ? [] : symptomNames,
      dangerSymptoms,
      temperature: temp !== undefined && Number.isFinite(temp) ? temp : undefined,
    };
    const draft = buildQuickDraft(input, registeredMedications);
    if (noProblem) {
      const result = evaluateQuickGuidance(input, historyLogs, registeredMedications, input.targetDate);
      if (result.needed) {
        // 押し切って「問題なし」と記録してしまわないよう、保存の前に案内する(保存は止めない)
        setGuidance({ result, draft });
        return;
      }
    }
    onSubmit(draft);
  };

  return (
    <div className="card">
      <h2>{noProblem ? "今日は問題なし(簡易確認)" : "今日はしんどい(簡易入力)"}</h2>
      <p className="field-hint">
        今日({todayIso()})の最低限だけ記録します。詳しい内容は、体調が落ち着いてから記録一覧の
        「詳細を追記」で入力できます。
        {noProblem &&
          " 体温・倦怠感・危険な症状を確認して保存します。測っていない項目は空欄のままで構いません(「なし」とは扱いません)。関節痛・皮疹・睡眠は聞かないため、簡易記録として保存されます。"}
      </p>

      {guidance && (
        <div className="card emergency-banner" role="alert" style={{ marginBottom: 12 }}>
          <strong>いつもと違うようです。詳しく記録しますか?</strong>
          <ul style={{ margin: "8px 0" }}>
            {guidance.result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="field-hint">
            診断ではなく、入力内容からの目安です(体温と危険症状はF10・Danger層と同じ基準、体調スコアの目安は暫定・主治医確認待ち)。
            体調が心配な場合は医療機関に相談してください。
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            {onSubmitAndAppend && (
              <button
                type="button"
                className="btn-primary"
                style={BIG}
                onClick={() => onSubmitAndAppend(guidance.draft)}
              >
                保存して詳細を追記する
              </button>
            )}
            <button type="button" className="btn-secondary" style={BIG} onClick={() => onSubmit(guidance.draft)}>
              このまま保存する
            </button>
            <button type="button" className="btn-ghost" onClick={() => setGuidance(null)}>
              戻って修正する
            </button>
          </div>
        </div>
      )}

      <div className="field">
        <label>今日の体調(1=つらい 〜 10=絶好調){noProblem ? "(任意)" : ""}</label>
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

      {!noProblem && (
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
      )}

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
        {lastTemperature && (
          <p className="field-hint" data-testid="last-temperature">
            前回の体温: {lastTemperature.value}℃({lastTemperature.date})。参考表示です。今日測っていなければ空欄のままにしてください。
          </p>
        )}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn-primary"
          style={BIG}
          disabled={!canSave}
          onClick={handleSave}
        >
          {noProblem ? "問題なしで保存" : "簡易記録を保存"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          通常入力に戻る
        </button>
      </div>
      {!canSave && <p className="field-hint">体調の数字を選ぶと保存できます。</p>}
    </div>
  );
}
