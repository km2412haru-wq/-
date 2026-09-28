import { generateId } from "@/lib/id";
import {
  loadDailyLogs,
  loadRegisteredMedications,
  loadTaperingEvents,
  saveDailyLogs,
  saveRegisteredMedications,
  saveTaperingEvents,
} from "@/lib/storage";
import type { DailyLog } from "@/types/vitalog";

/**
 * 過去の処方箋・検査結果票・お薬手帳の一括インポート/差分更新で使う共通ロジック。
 * 既存の「毎日の記録」に対しては、その日の記録が既にあれば上書きせず該当項目だけ追記し、
 * 無ければ最小限のDailyLogを新規作成してマージする。
 */

function emptyDailyLogFields(): Omit<DailyLog, "id" | "targetDate" | "recordedAt" | "createdAt" | "updatedAt"> {
  return {
    skipped: false,
    jointPain: [],
    symptoms: [],
    moodReasonTags: [],
    activityTags: [],
    medications: [],
    topicalMedications: [],
  };
}

function findOrCreateLog(logs: DailyLog[], targetDate: string): DailyLog {
  const existing = logs.find((l) => l.targetDate === targetDate && !l.skipped);
  if (existing) return existing;
  const now = new Date().toISOString();
  const fresh: DailyLog = {
    id: generateId(),
    targetDate,
    recordedAt: now,
    createdAt: now,
    updatedAt: now,
    ...emptyDailyLogFields(),
  };
  logs.push(fresh);
  return fresh;
}

/** 検査結果票の一括インポート: 対象日のDailyLogに検査値を追記(他の項目は上書きしない) */
export function applyBulkLabResult(targetDate: string, labs: NonNullable<DailyLog["labs"]>): void {
  const logs = loadDailyLogs();
  const log = findOrCreateLog(logs, targetDate);
  log.labs = { ...log.labs, ...labs };
  log.updatedAt = new Date().toISOString();
  saveDailyLogs(logs);
}

/** 処方箋の一括インポート: 対象日のDailyLogに服薬記録を1件追記(他の項目は上書きしない) */
export function applyBulkMedication(
  targetDate: string,
  medication: { name: string; dose?: string; sourcePhotoId?: string }
): void {
  const logs = loadDailyLogs();
  const log = findOrCreateLog(logs, targetDate);
  log.medications = [
    ...log.medications,
    { id: generateId(), name: medication.name, dose: medication.dose, type: "regular", sourcePhotoId: medication.sourcePhotoId },
  ];
  log.updatedAt = new Date().toISOString();
  saveDailyLogs(logs);
}

/**
 * 処方箋/お薬手帳の内容を「登録済みの薬」に反映する。
 * 3-1(処方箋インポート)・3-3(お薬手帳更新)で共用する。
 *
 * 名寄せの優先順位:
 * 1. 同名のactiveな薬があれば、用量変更として扱いテーパリング履歴に追記(updated)
 * 2. 同名のactive=falseな薬(中止済み)があれば、新規レコードを作らずそれを再利用して
 *    再開扱いにする(resumed)。減薬後に同じ薬が再処方されるケースで重複登録を防ぐため
 * 3. どちらにも一致しなければ新規登録(created)
 */
export function applyPrescriptionToRegisteredMedications(
  name: string,
  dose: string | undefined,
  date: string
): "created" | "updated" | "resumed" | "unchanged" {
  const meds = loadRegisteredMedications();
  const existingActive = meds.find((m) => m.name === name && m.active);

  if (existingActive) {
    if (existingActive.dose === dose) {
      return "unchanged";
    }
    const events = loadTaperingEvents();
    events.unshift({
      id: generateId(),
      medicationName: name,
      date,
      newDose: dose ?? "(用量不明)",
      note: "お薬手帳/処方箋インポートによる自動記録",
      createdAt: new Date().toISOString(),
    });
    saveTaperingEvents(events);

    existingActive.dose = dose;
    saveRegisteredMedications(meds);
    return "updated";
  }

  const existingInactive = meds.find((m) => m.name === name && !m.active);
  if (existingInactive) {
    const events = loadTaperingEvents();
    events.unshift({
      id: generateId(),
      medicationName: name,
      date,
      newDose: dose ?? "(用量不明)",
      note: "お薬手帳/処方箋インポートによる自動記録(再開)",
      createdAt: new Date().toISOString(),
    });
    saveTaperingEvents(events);

    existingInactive.active = true;
    existingInactive.endDate = undefined;
    // 再処方なので処方開始日を今回読み取った日付に更新する
    existingInactive.startDate = date;
    existingInactive.dose = dose;
    saveRegisteredMedications(meds);
    return "resumed";
  }

  meds.unshift({
    id: generateId(),
    name,
    dose,
    type: "regular",
    active: true,
    // 処方箋/お薬手帳から読み取った日付を処方開始日とする。
    // これによりバックフィル入力時、この日より前の対象日ではチェックリストに出ない
    startDate: date,
    createdAt: new Date().toISOString(),
  });
  saveRegisteredMedications(meds);
  return "created";
}

/** お薬手帳インポートで「リストに無くなった薬」を中止扱いにする(自動削除はしない) */
export function discontinueRegisteredMedication(name: string, date: string): void {
  const meds = loadRegisteredMedications();
  const existing = meds.find((m) => m.name === name && m.active);
  if (!existing) return;
  existing.active = false;
  existing.endDate = date;
  saveRegisteredMedications(meds);

  const events = loadTaperingEvents();
  events.unshift({
    id: generateId(),
    medicationName: name,
    date,
    newDose: "中止",
    note: "お薬手帳インポートによる自動記録",
    createdAt: new Date().toISOString(),
  });
  saveTaperingEvents(events);
}
