"use client";

import { useMemo, useState } from "react";
import { generateId } from "@/lib/id";
import PhotoCaptureButton from "@/components/PhotoCaptureButton";
import { useSpeechToText } from "@/lib/useSpeechToText";
import {
  ACTIVITY_TAGS,
  JOINT_SITES,
  LOAD_LEVELS,
  MEDICATION_TYPES,
  MOOD_REASON_TAGS,
  type ActivityTag,
  type JointPainEntry,
  type JointSite,
  type LoadLevel,
  type MedicationRecord,
  type MedicationType,
  type MoodReasonTag,
  type TopicalMedicationRecord,
} from "@/types/vitalog";
import type { DailyLogDraft } from "@/lib/useDailyLogs";

const MOOD_LOW_THRESHOLD = 4;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  onSubmit: (draft: DailyLogDraft) => void;
  onSkip: (targetDate: string) => void;
}

export default function DailyLogForm({ onSubmit, onSkip }: Props) {
  const [targetDate, setTargetDate] = useState(todayIso());
  const [temperature, setTemperature] = useState("");
  const [conditionScore, setConditionScore] = useState(7);
  const [jointPain, setJointPain] = useState<JointPainEntry[]>([]);
  const [hasSoreThroat, setHasSoreThroat] = useState(false);
  const [soreThroatSeverity, setSoreThroatSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [soreThroatUnusual, setSoreThroatUnusual] = useState(false);
  const [soreThroatNote, setSoreThroatNote] = useState("");
  const [moodScore, setMoodScore] = useState(7);
  const [moodReasonTags, setMoodReasonTags] = useState<MoodReasonTag[]>([]);
  const [fatigueUnusual, setFatigueUnusual] = useState(false);
  const [loadLevel, setLoadLevel] = useState<LoadLevel | undefined>(undefined);
  const [activityTags, setActivityTags] = useState<ActivityTag[]>([]);
  const [customActivityTag, setCustomActivityTag] = useState("");
  const [sleepHours, setSleepHours] = useState(7);
  const [showOptional, setShowOptional] = useState(false);
  const [musclePainOn, setMusclePainOn] = useState(false);
  const [musclePainSeverity, setMusclePainSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [lymphNoteOn, setLymphNoteOn] = useState(false);
  const [lymphNote, setLymphNote] = useState("");
  const [rashOn, setRashOn] = useState(false);
  const [rashNote, setRashNote] = useState("");
  const [rashPhoto, setRashPhoto] = useState<string | undefined>(undefined);
  const [labsOn, setLabsOn] = useState(false);
  const [wbc, setWbc] = useState("");
  const [ferritin, setFerritin] = useState("");
  const [crp, setCrp] = useState("");
  const [ast, setAst] = useState("");
  const [alt, setAlt] = useState("");
  const [platelets, setPlatelets] = useState("");
  const [labsPhotoId, setLabsPhotoId] = useState<string | undefined>(undefined);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [topicalMedications, setTopicalMedications] = useState<TopicalMedicationRecord[]>([]);
  const [memo, setMemo] = useState("");

  const { supported: speechSupported, listening, start, stop } = useSpeechToText((text) => {
    setMemo((prev) => (prev ? `${prev} ${text}` : text));
  });

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

  const addMedicationRow = () => {
    setMedications((prev) => [
      ...prev,
      { id: generateId(), name: "", type: "regular" as MedicationType },
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
    setConditionScore(7);
    setJointPain([]);
    setHasSoreThroat(false);
    setSoreThroatUnusual(false);
    setSoreThroatNote("");
    setMoodScore(7);
    setMoodReasonTags([]);
    setFatigueUnusual(false);
    setLoadLevel(undefined);
    setActivityTags([]);
    setCustomActivityTag("");
    setSleepHours(7);
    setMusclePainOn(false);
    setLymphNoteOn(false);
    setLymphNote("");
    setRashOn(false);
    setRashNote("");
    setRashPhoto(undefined);
    setLabsOn(false);
    setWbc("");
    setFerritin("");
    setCrp("");
    setAst("");
    setAlt("");
    setPlatelets("");
    setLabsPhotoId(undefined);
    setMedications([]);
    setTopicalMedications([]);
    setMemo("");
  };

  const canSubmit = useMemo(() => true, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const draft: DailyLogDraft = {
      targetDate,
      skipped: false,
      temperature: temperature ? Number(temperature) : undefined,
      conditionScore,
      jointPain,
      soreThroat: hasSoreThroat
        ? {
            severity: soreThroatSeverity,
            unusualNote: soreThroatUnusual ? soreThroatNote || "いつもと違う感覚あり" : undefined,
          }
        : undefined,
      moodScore,
      moodReasonTags: showMoodReason ? moodReasonTags : [],
      fatigueUnusual: fatigueUnusual || undefined,
      loadLevel,
      activityTags,
      sleepHours,
      rash: rashOn ? { note: rashNote || undefined, photoDataUrl: rashPhoto } : undefined,
      musclePain: musclePainOn ? { severity: musclePainSeverity } : undefined,
      lymphNodeSwelling: lymphNoteOn ? { note: lymphNote || undefined } : undefined,
      labs: labsOn
        ? {
            wbcPerUl: wbc ? Number(wbc) : undefined,
            ferritinNgMl: ferritin ? Number(ferritin) : undefined,
            crpMgDl: crp ? Number(crp) : undefined,
            astUL: ast ? Number(ast) : undefined,
            altUL: alt ? Number(alt) : undefined,
            plateletsPerUl: platelets ? Number(platelets) : undefined,
            sourcePhotoId: labsPhotoId,
          }
        : undefined,
      medications: medications.filter((m) => m.name.trim().length > 0),
      topicalMedications: topicalMedications.filter((t) => t.name.trim().length > 0),
      memo: memo.trim() || undefined,
    };
    onSubmit(draft);
    reset();
  };

  const handleRashPhoto = (file: File | null) => {
    if (!file) {
      setRashPhoto(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRashPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>今日の記録</h2>

      <div className="field">
        <label htmlFor="targetDate">対象日</label>
        <input
          id="targetDate"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          max={todayIso()}
        />
        <div className="field-hint">後日入力の場合はここを過去日にしてください</div>
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
        />
      </div>

      <div className="field">
        <label htmlFor="conditionScore">
          体調スコア(1〜10) <span className="slider-value">{conditionScore}</span>
        </label>
        <input
          id="conditionScore"
          type="range"
          min={1}
          max={10}
          value={conditionScore}
          onChange={(e) => setConditionScore(Number(e.target.value))}
        />
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
        <label>
          <input
            type="checkbox"
            checked={hasSoreThroat}
            onChange={(e) => setHasSoreThroat(e.target.checked)}
          />{" "}
          咽頭痛あり
        </label>
        {hasSoreThroat && (
          <div style={{ marginTop: 8 }}>
            <div className="row">
              <span>強さ</span>
              <input
                type="range"
                min={1}
                max={5}
                value={soreThroatSeverity}
                onChange={(e) =>
                  setSoreThroatSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                }
              />
              <span className="slider-value">{soreThroatSeverity}</span>
            </div>
            <label style={{ marginTop: 8, display: "block" }}>
              <input
                type="checkbox"
                checked={soreThroatUnusual}
                onChange={(e) => setSoreThroatUnusual(e.target.checked)}
              />{" "}
              普段と違う感覚がある
            </label>
            {soreThroatUnusual && (
              <input
                type="text"
                placeholder="どう違うか(任意)"
                value={soreThroatNote}
                onChange={(e) => setSoreThroatNote(e.target.value)}
                style={{ marginTop: 6 }}
              />
            )}
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="moodScore">
          気分スコア(1〜10) <span className="slider-value">{moodScore}</span>
        </label>
        <input
          id="moodScore"
          type="range"
          min={1}
          max={10}
          value={moodScore}
          onChange={(e) => setMoodScore(Number(e.target.value))}
        />
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
        <label htmlFor="sleepHours">
          睡眠時間(時間) <span className="slider-value">{sleepHours}</span>
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
        <label>服薬記録</label>
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
            <select
              value={m.type}
              onChange={(e) =>
                updateMedication(m.id, { type: e.target.value as MedicationType })
              }
            >
              {MEDICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "regular" ? "定期薬" : "頓服"}
                </option>
              ))}
            </select>
            <button type="button" className="btn-ghost" onClick={() => removeMedication(m.id)}>
              削除
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addMedicationRow}>
          ＋ 服薬を追加
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
                checked={musclePainOn}
                onChange={(e) => setMusclePainOn(e.target.checked)}
              />{" "}
              筋肉痛あり
            </label>
            {musclePainOn && (
              <div className="row" style={{ marginBottom: 8 }}>
                <span>強さ</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={musclePainSeverity}
                  onChange={(e) =>
                    setMusclePainSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
                  }
                />
                <span className="slider-value">{musclePainSeverity}</span>
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
                </div>
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
      <button
        type="button"
        className="btn-ghost"
        style={{ marginTop: 8 }}
        onClick={() => onSkip(targetDate)}
      >
        今日はスキップ
      </button>
    </form>
  );
}
