"use client";

import { useEffect, useMemo, useState } from "react";
import { generateId } from "@/lib/id";
import PhotoCaptureButton from "@/components/PhotoCaptureButton";
import { savePhotoBlob } from "@/lib/photoStore";
import { useSpeechToText } from "@/lib/useSpeechToText";
import { useEnvironment } from "@/lib/useEnvironment";
import { useMedications } from "@/lib/useMedications";
import { computeSymptomChips } from "@/lib/symptomStats";
import { choiceFromOnsetDate, onsetDateFromChoice, type OnsetChoice } from "@/lib/onsetChoice";
import FerritinEsrRatioNote from "@/components/FerritinEsrRatioNote";
import { useDailyLogs } from "@/lib/useDailyLogs";
import { isMedicationApplicableOnDate } from "@/lib/medicationApplicability";
import {
  ACTIVITY_TAGS,
  DANGER_SYMPTOMS,
  DEFAULT_SYMPTOM_NAMES,
  JOINT_SITES,
  LOAD_LEVELS,
  MOOD_REASON_TAGS,
  type ActivityTag,
  type JointPainEntry,
  type JointSite,
  type LoadLevel,
  type MedicationIntake,
  type MedicationRecord,
  type MedicationType,
  type DailyLog,
  type MoodReasonTag,
  type SymptomEntry,
  type TopicalMedicationRecord,
} from "@/types/vitalog";
import type { DailyLogDraft } from "@/lib/useDailyLogs";

const MOOD_LOW_THRESHOLD = 4;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 入眠時刻+睡眠時間から起床目安時刻(HH:mm)を算出する。表示用のみで保存はしない */
function estimateWakeTime(startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + Math.round(durationHours * 60);
  const wakeMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const wakeH = Math.floor(wakeMinutes / 60);
  const wakeM = wakeMinutes % 60;
  return `${String(wakeH).padStart(2, "0")}:${String(wakeM).padStart(2, "0")}`;
}

/** スライダーが「数字が大きいほど良い」方向であることを一目で伝えるための補助ラベル(極端な値のみ表示) */
function scaleLabel(score: number, low: string, high: string): string {
  if (score <= 3) return low;
  if (score >= 8) return high;
  return "";
}

interface SymptomDetail {
  severity: 1 | 2 | 3 | 4 | 5;
  unusualOn: boolean;
  unusualNote: string;
  /** 「いつから」の選択。既定は「この記録の日から」(保存する発症日は無し) */
  onset: OnsetChoice;
  onsetCustomDate: string;
}

const NEW_SYMPTOM_DETAIL: SymptomDetail = {
  severity: 3,
  unusualOn: false,
  unusualNote: "",
  onset: "same",
  onsetCustomDate: "",
};

interface Props {
  onSubmit: (draft: DailyLogDraft) => void;
  onSkip: (targetDate: string) => void;
  /** 簡易記録への「詳細を追記」。指定すると、簡易入力でカバーした項目をプリフィルする */
  appendTo?: DailyLog | null;
  onCancelAppend?: () => void;
}

export default function DailyLogForm({ onSubmit, onSkip, appendTo, onCancelAppend }: Props) {
  const [targetDate, setTargetDate] = useState(todayIso());
  const [temperature, setTemperature] = useState("");
  const [temperatureUnmeasured, setTemperatureUnmeasured] = useState(false);
  const [conditionScore, setConditionScore] = useState(7);
  const [jointPain, setJointPain] = useState<JointPainEntry[]>([]);
  const [symptomNames, setSymptomNames] = useState<string[]>([]);
  const [customSymptomName, setCustomSymptomName] = useState("");
  const [symptomDetails, setSymptomDetails] = useState<Record<string, SymptomDetail>>({});
  const [moodScore, setMoodScore] = useState(7);
  const [moodReasonTags, setMoodReasonTags] = useState<MoodReasonTag[]>([]);
  const [fatigueUnusual, setFatigueUnusual] = useState(false);
  const [loadLevel, setLoadLevel] = useState<LoadLevel | undefined>(undefined);
  const [activityTags, setActivityTags] = useState<ActivityTag[]>([]);
  const [customActivityTag, setCustomActivityTag] = useState("");
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepStartTime, setSleepStartTime] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [productivityOn, setProductivityOn] = useState(false);
  const [productivityScore, setProductivityScore] = useState(5);
  const [lymphNoteOn, setLymphNoteOn] = useState(false);
  const [lymphNote, setLymphNote] = useState("");
  const [rashOn, setRashOn] = useState(false);
  const [rashPhotoSaving, setRashPhotoSaving] = useState(false);
  const [rashNote, setRashNote] = useState("");
  const [rashPhotoId, setRashPhotoId] = useState<string | undefined>(undefined);
  const [labsOn, setLabsOn] = useState(false);
  const [wbc, setWbc] = useState("");
  const [ferritin, setFerritin] = useState("");
  const [crp, setCrp] = useState("");
  const [ast, setAst] = useState("");
  const [alt, setAlt] = useState("");
  const [platelets, setPlatelets] = useState("");
  const [esr, setEsr] = useState("");
  const [labsPhotoId, setLabsPhotoId] = useState<string | undefined>(undefined);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  // 定期薬の確認状態。未操作(キーなし)は「未確認」として扱い、既定で服用済みにはしない
  const [medicationChecklist, setMedicationChecklist] = useState<Record<string, MedicationIntake>>({});
  const [dangerSymptoms, setDangerSymptoms] = useState<string[]>([]);
  const [topicalMedications, setTopicalMedications] = useState<TopicalMedicationRecord[]>([]);
  const [memo, setMemo] = useState("");

  const { registeredMedications } = useMedications();
  const { dailyLogs: historyLogs } = useDailyLogs();

  // 簡易記録への追記: 簡易入力でカバーした項目(体調スコア・倦怠感・体温・症状・危険症状)を
  // プリフィルする。追記後の値(空を含む)が利用者の意図として優先されるため、消した項目は消える
  useEffect(() => {
    if (!appendTo) return;
    setTargetDate(appendTo.targetDate);
    if (typeof appendTo.conditionScore === "number") setConditionScore(appendTo.conditionScore);
    setFatigueUnusual(!!appendTo.fatigueUnusual);
    if (appendTo.temperature === "unmeasured") {
      setTemperatureUnmeasured(true);
      setTemperature("");
    } else if (typeof appendTo.temperature === "number") {
      setTemperatureUnmeasured(false);
      setTemperature(String(appendTo.temperature));
    }
    setDangerSymptoms(appendTo.dangerSymptoms ?? []);
    setSymptomNames(appendTo.symptoms.map((sym) => sym.name));
    setSymptomDetails(
      Object.fromEntries(
        appendTo.symptoms.map((sym) => {
          const onset = choiceFromOnsetDate(appendTo.targetDate, sym.onsetDate);
          return [
            sym.name,
            {
              severity: sym.severity,
              unusualOn: !!sym.unusualNote,
              unusualNote: sym.unusualNote ?? "",
              onset: onset.choice,
              onsetCustomDate: onset.customDate,
            },
          ];
        })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appendTo?.id]);

  // 症状チップの並び順・自由入力のチップ昇格・入力候補は、過去の記録頻度から算出する
  const { chipNames: orderedChipNames, suggestions: symptomSuggestions } = useMemo(
    () => computeSymptomChips(historyLogs),
    [historyLogs]
  );
  // バックフィル対応: 対象日の時点でまだ処方されていなかった薬・既に中止していた薬は
  // チェックリストに出さない(startDate/endDateで判定。旧データはいつでも表示可)
  const activeRegularMedications = registeredMedications.filter(
    (m) => m.type === "regular" && isMedicationApplicableOnDate(m, targetDate)
  );

  const { supported: speechSupported, listening, start, stop } = useSpeechToText((text) => {
    setMemo((prev) => (prev ? `${prev} ${text}` : text));
  });

  const {
    location: envLocation,
    environment,
    loading: envLoading,
    error: envError,
    enableLocation,
  } = useEnvironment(targetDate);

  const showMoodReason = moodScore <= MOOD_LOW_THRESHOLD;

  const toggleJointSite = (site: JointSite) => {
    setJointPain((prev) => {
      const exists = prev.find((p) => p.site === site);
      if (exists) return prev.filter((p) => p.site !== site);
      return [...prev, { site, severity: 3 }];
    });
  };

  const setJointSeverity = (site: JointSite, severity: 1 | 2 | 3 | 4 | 5) => {
    setJointPain((prev) => prev.map((p) => (p.site === site ? { ...p, severity } : p)));
  };

  const toggleMoodReason = (tag: MoodReasonTag) => {
    setMoodReasonTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleActivityTag = (tag: ActivityTag) => {
    setActivityTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomActivityTag = () => {
    const tag = customActivityTag.trim();
    if (!tag || activityTags.includes(tag)) return;
    setActivityTags((prev) => [...prev, tag]);
    setCustomActivityTag("");
  };

  const toggleSymptom = (name: string) => {
    setSymptomNames((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
    setSymptomDetails((prev) => {
      if (prev[name]) return prev;
      return { ...prev, [name]: NEW_SYMPTOM_DETAIL };
    });
  };

  const addCustomSymptom = () => {
    const name = customSymptomName.trim();
    if (!name || symptomNames.includes(name)) return;
    setSymptomNames((prev) => [...prev, name]);
    setSymptomDetails((prev) => ({ ...prev, [name]: NEW_SYMPTOM_DETAIL }));
    setCustomSymptomName("");
  };

  const updateSymptomDetail = (
    name: string,
    changes: Partial<SymptomDetail>
  ) => {
    setSymptomDetails((prev) => ({
      ...prev,
      [name]: { ...(prev[name] ?? NEW_SYMPTOM_DETAIL), ...changes },
    }));
  };

  const addMedicationRow = () => {
    // 定期薬はチェックリスト方式に移行したため、手動追加は頓服専用
    setMedications((prev) => [
      ...prev,
      { id: generateId(), name: "", type: "asNeeded" as MedicationType },
    ]);
  };

  const updateMedication = (id: string, changes: Partial<MedicationRecord>) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  };

  const removeMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const addTopicalRow = () => {
    setTopicalMedications((prev) => [...prev, { id: generateId(), name: "" }]);
  };

  const updateTopical = (id: string, changes: Partial<TopicalMedicationRecord>) => {
    setTopicalMedications((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  };

  const removeTopical = (id: string) => {
    setTopicalMedications((prev) => prev.filter((t) => t.id !== id));
  };

  const reset = () => {
    setTemperature("");
    setTemperatureUnmeasured(false);
    setConditionScore(7);
    setJointPain([]);
    setSymptomNames([]);
    setCustomSymptomName("");
    setSymptomDetails({});
    setMoodScore(7);
    setMoodReasonTags([]);
    setFatigueUnusual(false);
    setLoadLevel(undefined);
    setActivityTags([]);
    setCustomActivityTag("");
    setSleepHours(7);
    setSleepStartTime("");
    setProductivityOn(false);
    setProductivityScore(5);
    setLymphNoteOn(false);
    setLymphNote("");
    setRashOn(false);
    setRashNote("");
    setRashPhotoId(undefined);
    setLabsOn(false);
    setWbc("");
    setFerritin("");
    setCrp("");
    setAst("");
    setAlt("");
    setPlatelets("");
    setEsr("");
    setLabsPhotoId(undefined);
    setMedications([]);
    setMedicationChecklist({});
    setDangerSymptoms([]);
    setTopicalMedications([]);
    setMemo("");
  };

  const canSubmit = useMemo(() => true, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const draft: DailyLogDraft = {
      targetDate,
      skipped: false,
      temperature: temperatureUnmeasured ? "unmeasured" : temperature ? Number(temperature) : undefined,
      conditionScore,
      jointPain,
      symptoms: symptomNames.map((name): SymptomEntry => {
        const d = symptomDetails[name] ?? NEW_SYMPTOM_DETAIL;
        return {
          name,
          severity: d.severity,
          unusualNote: d.unusualOn ? d.unusualNote || "いつもと違う感覚あり" : undefined,
          onsetDate: onsetDateFromChoice(targetDate, d.onset, d.onsetCustomDate),
        };
      }),
      dangerSymptoms,
      moodScore,
      moodReasonTags: showMoodReason ? moodReasonTags : [],
      fatigueUnusual: fatigueUnusual || undefined,
      loadLevel,
      activityTags,
      sleepHours,
      sleepStartTime: sleepStartTime || undefined,
      productivityScore: productivityOn ? productivityScore : undefined,
      environment: environment ?? undefined,
      rash: rashOn ? { note: rashNote || undefined, sourcePhotoId: rashPhotoId } : undefined,
      lymphNodeSwelling: lymphNoteOn ? { note: lymphNote || undefined } : undefined,
      labs: labsOn
        ? {
            wbcPerUl: wbc ? Number(wbc) : undefined,
            ferritinNgMl: ferritin ? Number(ferritin) : undefined,
            crpMgDl: crp ? Number(crp) : undefined,
            astUL: ast ? Number(ast) : undefined,
            altUL: alt ? Number(alt) : undefined,
            plateletsPerUl: platelets ? Number(platelets) : undefined,
            esrMmH: esr ? Number(esr) : undefined,
            sourcePhotoId: labsPhotoId,
          }
        : undefined,
      medications: [
        ...activeRegularMedications.map((m) => ({
          id: generateId(),
          name: m.name,
          dose: m.dose,
          type: "regular" as MedicationType,
          registeredMedicationId: m.id,
          intake: medicationChecklist[m.id] ?? ("unconfirmed" as MedicationIntake),
        })),
        // 頓服・写真から追加した薬は、その場で記録した=服用したものとして扱う
        ...medications
          .filter((m) => m.name.trim().length > 0)
          .map((m) => ({ ...m, intake: m.intake ?? ("taken" as MedicationIntake) })),
      ],
      topicalMedications: topicalMedications.filter((t) => t.name.trim().length > 0),
      memo: memo.trim() || undefined,
    };
    onSubmit(draft);
    reset();
  };

  const handleRashPhoto = async (file: File | null) => {
    if (!file) {
      setRashPhotoId(undefined);
      return;
    }
    setRashPhotoSaving(true);
    try {
      const id = generateId();
      await savePhotoBlob(id, file);
      setRashPhotoId(id);
    } catch (err) {
      console.error("皮疹写真の保存に失敗しました:", err);
      setRashPhotoId(undefined);
    } finally {
      setRashPhotoSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{appendTo ? `${appendTo.targetDate}の簡易記録に詳細を追記` : "今日の記録"}</h2>
      {appendTo && (
        <div className="field-hint" style={{ marginBottom: 8 }}>
          簡易入力で記録した内容が入力済みです。詳しい項目を足して「記録する」を押すと、この日の記録が
          通常の記録に更新されます(簡易入力の内容は消えません)。{" "}
          <button type="button" className="btn-ghost" onClick={onCancelAppend}>
            追記をやめる
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor="targetDate">対象日</label>
        <input
          id="targetDate"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          max={todayIso()}
          disabled={!!appendTo}
        />
        <div className="field-hint">後日入力の場合はここを過去日にしてください</div>
      </div>

      <div className="field">
        <label>環境データ(気温・気圧・湿度)</label>
        {!envLocation && (
          <button type="button" className="btn-secondary" onClick={enableLocation}>
            📍 位置情報を取得して自動記録を有効にする
          </button>
        )}
        {envLocation && envLoading && <p className="muted">取得中...</p>}
        {envLocation && !envLoading && environment && (
          <div className="row">
            {environment.temperatureC != null && <span className="tag">🌡️ {environment.temperatureC}℃</span>}
            {environment.pressureHpa != null && <span className="tag">🌬️ {environment.pressureHpa}hPa</span>}
            {environment.humidityPercent != null && <span className="tag">💧 {environment.humidityPercent}%</span>}
          </div>
        )}
        {envLocation && !envLoading && envError && (
          <p className="field-hint">{envError}(手入力は不要、記録自体は続行できます)</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="temperature">体温(℃)</label>
        <input
          id="temperature"
          type="number"
          step="0.1"
          min="30"
          max="43"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          placeholder="例: 36.8"
          disabled={temperatureUnmeasured}
        />
        <label style={{ display: "block", marginTop: 6 }}>
          <input
            type="checkbox"
            checked={temperatureUnmeasured}
            onChange={(e) => {
              setTemperatureUnmeasured(e.target.checked);
              if (e.target.checked) setTemperature("");
            }}
          />{" "}
          今日は体温を測っていない(未測定)
        </label>
      </div>

      <div className="field">
        <label htmlFor="conditionScore">
          体調スコア(1〜10) <span className="slider-value">{conditionScore}</span>{" "}
          {scaleLabel(conditionScore, "つらい", "絶好調") && (
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              ({scaleLabel(conditionScore, "つらい", "絶好調")})
            </span>
          )}
        </label>
        <input
          id="conditionScore"
          type="range"
          min={1}
          max={10}
          value={conditionScore}
          onChange={(e) => setConditionScore(Number(e.target.value))}
        />
        <div className="row slider-endpoints">
          <span>😣 つらい</span>
          <span>絶好調 😊</span>
        </div>
      </div>

      <div className="field">
        <label>関節痛(部位)</label>
        <div className="row">
          {JOINT_SITES.map((site) => (
            <button
              type="button"
              key={site}
              className="chip"
              data-active={jointPain.some((p) => p.site === site)}
              onClick={() => toggleJointSite(site)}
            >
              {site}
            </button>
          ))}
        </div>
        {jointPain.map((p) => (
          <div key={p.site} className="row" style={{ marginTop: 8 }}>
            <span style={{ minWidth: "3em" }}>{p.site}</span>
            <input
              type="range"
              min={1}
              max={5}
              value={p.severity}
              onChange={(e) =>
                setJointSeverity(p.site, Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
              }
            />
            <span className="slider-value">{p.severity}</span>
          </div>
        ))}
      </div>

      <div className="field">
        <label>症状</label>
        <div className="row">
          {orderedChipNames.map((name) => (
            <button
              type="button"
              key={name}
              className="chip"
              data-active={symptomNames.includes(name)}
              onClick={() => toggleSymptom(name)}
            >
              {name}
            </button>
          ))}
          {symptomNames
            .filter((n) => !orderedChipNames.includes(n))
            .map((name) => (
              <button
                type="button"
                key={name}
                className="chip"
                data-active
                onClick={() => toggleSymptom(name)}
              >
                {name}
              </button>
            ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="text"
            placeholder="症状を追加(任意)"
            value={customSymptomName}
            onChange={(e) => setCustomSymptomName(e.target.value)}
            list="symptom-suggestions"
          />
          <datalist id="symptom-suggestions">
            {symptomSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button type="button" className="btn-secondary" onClick={addCustomSymptom}>
            追加
          </button>
        </div>

        {symptomNames.map((name) => {
          const d = symptomDetails[name] ?? NEW_SYMPTOM_DETAIL;
          return (
            <div key={name} style={{ marginTop: 12 }}>
              <strong>{name}</strong>
              <div className="row" style={{ marginTop: 4 }}>
                <span>強さ</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={d.severity}
                  onChange={(e) =>
                    updateSymptomDetail(name, {
                      severity: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                />
                <span className="slider-value">{d.severity}</span>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <span>いつから</span>
                {(
                  [
                    ["same", "この日から"],
                    ["1", "1日前から"],
                    ["2", "2日前から"],
                    ["custom", "日付を指定"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className="chip"
                    data-active={d.onset === value}
                    onClick={() => updateSymptomDetail(name, { onset: value })}
                  >
                    {label}
                  </button>
                ))}
                {d.onset === "custom" && (
                  <input
                    type="date"
                    aria-label={`${name}の始まった日`}
                    value={d.onsetCustomDate}
                    max={targetDate}
                    onChange={(e) => updateSymptomDetail(name, { onsetCustomDate: e.target.value })}
                  />
                )}
              </div>
              <label style={{ marginTop: 8, display: "block" }}>
                <input
                  type="checkbox"
                  checked={d.unusualOn}
                  onChange={(e) => updateSymptomDetail(name, { unusualOn: e.target.checked })}
                />{" "}
                普段と違う感覚がある
              </label>
              {d.unusualOn && (
                <input
                  type="text"
                  placeholder="どう違うか(任意)"
                  value={d.unusualNote}
                  onChange={(e) => updateSymptomDetail(name, { unusualNote: e.target.value })}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="field">
        <label>危険な症状(当てはまるものがあれば選択)</label>
        <div className="field-hint">
          選択すると、AOSDの再燃判定とは別に、医療機関への相談をご検討いただく通知を表示します
        </div>
        {DANGER_SYMPTOMS.map((name) => (
          <label key={name} style={{ display: "block", marginTop: 6 }}>
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
        <label htmlFor="moodScore">
          気分スコア(1〜10) <span className="slider-value">{moodScore}</span>{" "}
          {scaleLabel(moodScore, "沈んでいる", "最高") && (
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              ({scaleLabel(moodScore, "沈んでいる", "最高")})
            </span>
          )}
        </label>
        <input
          id="moodScore"
          type="range"
          min={1}
          max={10}
          value={moodScore}
          onChange={(e) => setMoodScore(Number(e.target.value))}
        />
        <div className="row slider-endpoints">
          <span>😞 沈んでいる</span>
          <span>最高 😄</span>
        </div>
        {showMoodReason && (
          <div className="row" style={{ marginTop: 8 }}>
            {MOOD_REASON_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                className="chip"
                data-active={moodReasonTags.includes(tag)}
                onClick={() => toggleMoodReason(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={fatigueUnusual}
            onChange={(e) => setFatigueUnusual(e.target.checked)}
          />{" "}
          普段と違う強い倦怠感がある
        </label>
        <div className="field-hint">MAS等の重篤な合併症の早期発見に使う重要な項目です</div>
      </div>

      <div className="field">
        <label>今日の負荷感</label>
        <div className="row">
          {LOAD_LEVELS.map((level) => (
            <button
              type="button"
              key={level}
              className="chip"
              data-active={loadLevel === level}
              onClick={() => setLoadLevel(loadLevel === level ? undefined : level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>活動タグ</label>
        <div className="row">
          {ACTIVITY_TAGS.map((tag) => (
            <button
              type="button"
              key={tag}
              className="chip"
              data-active={activityTags.includes(tag)}
              onClick={() => toggleActivityTag(tag)}
            >
              {tag}
            </button>
          ))}
          {activityTags
            .filter((t) => !(ACTIVITY_TAGS as readonly string[]).includes(t))
            .map((tag) => (
              <button
                type="button"
                key={tag}
                className="chip"
                data-active
                onClick={() => toggleActivityTag(tag)}
              >
                {tag}
              </button>
            ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="text"
            placeholder="タグを追加(任意)"
            value={customActivityTag}
            onChange={(e) => setCustomActivityTag(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={addCustomActivityTag}>
            追加
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="sleepStartTime">入眠時刻(任意)</label>
        <input
          id="sleepStartTime"
          type="time"
          value={sleepStartTime}
          onChange={(e) => setSleepStartTime(e.target.value)}
        />
        <div className="field-hint">
          日をまたぐ睡眠でも起床時刻の日付が曖昧にならないよう、入眠時刻と睡眠時間の組み合わせで記録します
        </div>
        <label htmlFor="sleepHours" style={{ marginTop: 12, display: "block" }}>
          睡眠時間(時間) <span className="slider-value">{sleepHours}</span>
          {sleepStartTime && (
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {" "}
              (起床目安 {estimateWakeTime(sleepStartTime, sleepHours)})
            </span>
          )}
        </label>
        <input
          id="sleepHours"
          type="range"
          min={0}
          max={14}
          step={0.5}
          value={sleepHours}
          onChange={(e) => setSleepHours(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>定期薬(服用の確認)</label>
        <div className="field-hint">確認していない薬は「未確認」のまま記録されます(服用したことにはなりません)</div>
        {registeredMedications.some((m) => m.type === "regular") &&
          activeRegularMedications.length <
            registeredMedications.filter((m) => m.type === "regular").length && (
            <p className="field-hint">
              ※対象日の時点でまだ処方されていなかった、または既に中止していた定期薬は
              リストから除外しています。
            </p>
          )}
        {activeRegularMedications.length === 0 ? (
          <p className="field-hint">
            登録済みの定期薬がありません。「服薬管理」画面から登録できます。
          </p>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginBottom: 8 }}
              onClick={() =>
                setMedicationChecklist(
                  Object.fromEntries(
                    activeRegularMedications.map((m) => [m.id, "taken" as MedicationIntake])
                  )
                )
              }
            >
              ✓ いつも通り全部服用した
            </button>
            {activeRegularMedications.map((m) => {
              const current: MedicationIntake = medicationChecklist[m.id] ?? "unconfirmed";
              return (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <div>
                    {m.name}
                    {m.dose && <span className="muted"> ({m.dose})</span>}
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    {(
                      [
                        ["taken", "服用"],
                        ["notTaken", "未服用"],
                        ["unconfirmed", "未確認"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className="chip"
                        data-active={current === value}
                        onClick={() => setMedicationChecklist((prev) => ({ ...prev, [m.id]: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="field">
        <label>頓服(その場で追加)</label>
        {medications.map((m) => (
          <div key={m.id} className="row" style={{ marginBottom: 6 }}>
            <input
              type="text"
              placeholder="薬品名"
              value={m.name}
              onChange={(e) => updateMedication(m.id, { name: e.target.value })}
              style={{ flex: 2 }}
            />
            <input
              type="text"
              placeholder="用量(任意)"
              value={m.dose ?? ""}
              onChange={(e) => updateMedication(m.id, { dose: e.target.value })}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-ghost" onClick={() => removeMedication(m.id)}>
              削除
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addMedicationRow}>
          ＋ 頓服を追加
        </button>
        <PhotoCaptureButton
          kind="medication"
          label="📷 薬の写真から読み取る"
          onConfirm={(fields, photoId) => {
            if (!fields.name && !fields.dose) return;
            setMedications((prev) => [
              ...prev,
              {
                id: generateId(),
                name: fields.name ?? "",
                dose: fields.dose,
                type: "asNeeded",
                sourcePhotoId: photoId,
              },
            ]);
          }}
        />
      </div>

      <div className="field">
        <label>外用薬(シップ・ローション等)</label>
        {topicalMedications.map((t) => (
          <div key={t.id} className="row" style={{ marginBottom: 6 }}>
            <input
              type="text"
              placeholder="品目名"
              value={t.name}
              onChange={(e) => updateTopical(t.id, { name: e.target.value })}
              style={{ flex: 2 }}
            />
            <input
              type="text"
              placeholder="使用部位(任意)"
              value={t.site ?? ""}
              onChange={(e) => updateTopical(t.id, { site: e.target.value })}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-ghost" onClick={() => removeTopical(t.id)}>
              削除
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addTopicalRow}>
          ＋ 外用薬を追加
        </button>
        <PhotoCaptureButton
          kind="topical"
          label="📷 外用薬の写真から読み取る"
          onConfirm={(fields, photoId) => {
            if (!fields.name) return;
            setTopicalMedications((prev) => [
              ...prev,
              {
                id: generateId(),
                name: fields.name ?? "",
                site: fields.site,
                note: fields.note,
                sourcePhotoId: photoId,
              },
            ]);
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="memo">自由メモ</label>
        <textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="気になったことを自由に(任意)"
        />
        {speechSupported && (
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: 8 }}
            onClick={listening ? stop : start}
          >
            {listening ? "音声入力を停止" : "🎤 音声入力を開始"}
          </button>
        )}
      </div>

      <div className="field">
        <button type="button" className="btn-ghost" onClick={() => setShowOptional((v) => !v)}>
          {showOptional ? "▲ その他の項目を閉じる" : "▼ その他の項目(任意・低優先度)"}
        </button>
        {showOptional && (
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={productivityOn}
                onChange={(e) => setProductivityOn(e.target.checked)}
              />{" "}
              今日の成果実感を記録する(F12-5・健康×生産性相関)
            </label>
            {productivityOn && (
              <div className="row" style={{ marginBottom: 12 }}>
                <span>成果実感</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={productivityScore}
                  onChange={(e) => setProductivityScore(Number(e.target.value))}
                />
                <span className="slider-value">{productivityScore}</span>
              </div>
            )}

            <label style={{ display: "block", marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={lymphNoteOn}
                onChange={(e) => setLymphNoteOn(e.target.checked)}
              />{" "}
              リンパ節の腫れあり
            </label>
            {lymphNoteOn && (
              <input
                type="text"
                placeholder="メモ(任意)"
                value={lymphNote}
                onChange={(e) => setLymphNote(e.target.value)}
                style={{ marginBottom: 8 }}
              />
            )}

            <label style={{ display: "block", marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={rashOn}
                onChange={(e) => setRashOn(e.target.checked)}
              />{" "}
              皮疹あり(実験的機能)
            </label>
            {rashOn && (
              <>
                <input
                  type="text"
                  placeholder="メモ(任意)"
                  value={rashNote}
                  onChange={(e) => setRashNote(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleRashPhoto(e.target.files?.[0] ?? null)}
                />
                {rashPhotoSaving && <p className="field-hint">写真を保存しています...</p>}
                {rashPhotoId && !rashPhotoSaving && (
                  <p className="field-hint">写真を保存しました(この端末にのみ保存されます)</p>
                )}
              </>
            )}

            <label style={{ display: "block", marginTop: 12, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={labsOn}
                onChange={(e) => setLabsOn(e.target.checked)}
              />{" "}
              採血結果の入力あり(任意・重篤な合併症の早期検知に利用)
            </label>
            {labsOn && (
              <>
                <div className="row" style={{ marginBottom: 8 }}>
                  <input
                    type="number"
                    placeholder="WBC(/μL)"
                    value={wbc}
                    onChange={(e) => setWbc(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="フェリチン(ng/mL)"
                    value={ferritin}
                    onChange={(e) => setFerritin(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="CRP(mg/dL)"
                    value={crp}
                    onChange={(e) => setCrp(e.target.value)}
                  />
                </div>
                <div className="row">
                  <input
                    type="number"
                    placeholder="AST(U/L)"
                    value={ast}
                    onChange={(e) => setAst(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="ALT(U/L)"
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="血小板数(/μL)"
                    value={platelets}
                    onChange={(e) => setPlatelets(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="ESR(mm/h)"
                    value={esr}
                    onChange={(e) => setEsr(e.target.value)}
                  />
                </div>
                <FerritinEsrRatioNote
                  labs={{
                    ferritinNgMl: ferritin ? Number(ferritin) : undefined,
                    esrMmH: esr ? Number(esr) : undefined,
                  }}
                />
                <PhotoCaptureButton
                  kind="labResult"
                  label="📷 検査結果票の写真から読み取る"
                  onConfirm={(fields, photoId) => {
                    if (fields.wbcPerUl != null) setWbc(String(fields.wbcPerUl));
                    if (fields.ferritinNgMl != null) setFerritin(String(fields.ferritinNgMl));
                    if (fields.crpMgDl != null) setCrp(String(fields.crpMgDl));
                    if (fields.astUL != null) setAst(String(fields.astUL));
                    if (fields.altUL != null) setAlt(String(fields.altUL));
                    if (fields.plateletsPerUl != null) setPlatelets(String(fields.plateletsPerUl));
                    if (fields.esrMmH != null) setEsr(String(fields.esrMmH));
                    setLabsPhotoId(photoId);
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          記録する
        </button>
      </div>
      {!appendTo && (
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 8 }}
          onClick={() => onSkip(targetDate)}
        >
          今日はスキップ
        </button>
      )}
    </form>
  );
}
