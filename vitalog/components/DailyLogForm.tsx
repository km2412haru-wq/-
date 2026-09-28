"use client";

import { useMemo, useState } from "react";
import { generateId } from "@/lib/id";
import { useSpeechToText } from "@/lib/useSpeechToText";
import {
  JOINT_SITES,
  MEDICATION_TYPES,
  MOOD_REASON_TAGS,
  type JointPainEntry,
  type JointSite,
  type MedicationRecord,
  type MedicationType,
  type MoodReasonTag,
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
  const [showOptional, setShowOptional] = useState(false);
  const [musclePainOn, setMusclePainOn] = useState(false);
  const [musclePainSeverity, setMusclePainSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [lymphNoteOn, setLymphNoteOn] = useState(false);
  const [lymphNote, setLymphNote] = useState("");
  const [rashOn, setRashOn] = useState(false);
  const [rashNote, setRashNote] = useState("");
  const [rashPhoto, setRashPhoto] = useState<string | undefined>(undefined);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
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

  const reset = () => {
    setTemperature("");
    setConditionScore(7);
    setJointPain([]);
    setHasSoreThroat(false);
    setSoreThroatUnusual(false);
    setSoreThroatNote("");
    setMoodScore(7);
    setMoodReasonTags([]);
    setMusclePainOn(false);
    setLymphNoteOn(false);
    setLymphNote("");
    setRashOn(false);
    setRashNote("");
    setRashPhoto(undefined);
    setMedications([]);
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
      rash: rashOn ? { note: rashNote || undefined, photoDataUrl: rashPhoto } : undefined,
      musclePain: musclePainOn ? { severity: musclePainSeverity } : undefined,
      lymphNodeSwelling: lymphNoteOn ? { note: lymphNote || undefined } : undefined,
      medications: medications.filter((m) => m.name.trim().length > 0),
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
