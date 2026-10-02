import { generateId } from "@/lib/id";
import { updateStore } from "@/lib/storage";
import type { DailyLog, VitalogStore } from "@/types/vitalog";

/**
 * 過去の処方箋・検査結果票・お薬手帳の一括インポート/差分更新で使う共通ロジック。
 * 既存の「毎日の記録」に対しては、その日の記録が既にあれば上書きせず該当項目だけ追記し、
 * 無ければ最小限のDailyLogを新規作成してマージする。
 *
 * 保存は全て updateStore(保存の瞬間に最新を読み直して適用)を通す。
 * 画面の配列をまるごと書き戻さないので、別タブ・別の画面が直前に保存した記録を消さない。
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

/**
 * 対象日の記録(スキップ以外)を探し、無ければ新しい記録を作る。
 * 新規作成する記録は「検査値のみ(labsOnly)」の印を付ける。症状・体調などを一切聞いていない日を、
 * 「症状なしの記録日」として数えない(記録が無いこと ≠ 症状が無いこと。isRecordedDay参照)ため。
 */
function findOrCreateLog(logs: DailyLog[], targetDate: string): { log: DailyLog; created: boolean } {
  const existing = logs.find((l) => l.targetDate === targetDate && !l.skipped);
  if (existing) return { log: existing, created: false };
  const now = new Date().toISOString();
  const fresh: DailyLog = {
    id: generateId(),
    targetDate,
    recordedAt: now,
    createdAt: now,
    updatedAt: now,
    labsOnly: true,
    ...emptyDailyLogFields(),
  };
  return { log: fresh, created: true };
}

/** 変更した記録を、(新規なら末尾に追加して)置き換えたdailyLogsを返す */
function withLog(store: VitalogStore, log: DailyLog, created: boolean): VitalogStore {
  return {
    ...store,
    dailyLogs: created
      ? [...store.dailyLogs, log]
      : store.dailyLogs.map((l) => (l.id === log.id ? log : l)),
  };
}

/** 検査結果票の一括インポート: 対象日のDailyLogに検査値を追記(他の項目は上書きしない)。保存できたらtrue */
export function applyBulkLabResult(targetDate: string, labs: NonNullable<DailyLog["labs"]>): boolean {
  return updateStore((store) => {
    const { log, created } = findOrCreateLog(store.dailyLogs, targetDate);
    // 読み取れなかった項目(undefined)で、その日の既存の検査値を消さない(「上書きせず追記」)
    const provided = Object.fromEntries(Object.entries(labs).filter(([, v]) => v !== undefined));
    const next: DailyLog = {
      ...log,
      labs: { ...log.labs, ...provided },
      updatedAt: new Date().toISOString(),
    };
    return withLog(store, next, created);
  });
}

/** 処方箋の一括インポート: 対象日のDailyLogに服薬記録を1件追記(他の項目は上書きしない)。保存できたらtrue */
export function applyBulkMedication(
  targetDate: string,
  medication: { name: string; dose?: string; sourcePhotoId?: string }
): boolean {
  return updateStore((store) => {
    const { log, created } = findOrCreateLog(store.dailyLogs, targetDate);
    const next: DailyLog = {
      ...log,
      medications: [
        ...log.medications,
        { id: generateId(), name: medication.name, dose: medication.dose, type: "regular", sourcePhotoId: medication.sourcePhotoId },
      ],
      updatedAt: new Date().toISOString(),
    };
    return withLog(store, next, created);
  });
}

type PrescriptionResult = "created" | "updated" | "resumed" | "unchanged" | "failed";

/**
 * 処方箋/お薬手帳の内容を「登録済みの薬」に反映する。
 * 3-1(処方箋インポート)・3-3(お薬手帳更新)で共用する。
 *
 * 名寄せの優先順位:
 * 1. 同名のactiveな薬があれば、用量変更として扱いテーパリング履歴に追記(updated)
 * 2. 同名のactive=falseな薬(中止済み)があれば、新規レコードを作らずそれを再利用して
 *    再開扱いにする(resumed)。減薬後に同じ薬が再処方されるケースで重複登録を防ぐため
 * 3. どちらにも一致しなければ新規登録(created)
 * 保存できなかった場合は "failed"。
 */
export function applyPrescriptionToRegisteredMedications(
  name: string,
  dose: string | undefined,
  date: string
): PrescriptionResult {
  let result: PrescriptionResult = "unchanged";
  const saved = updateStore((store) => {
    const meds = store.registeredMedications;
    const existingActive = meds.find((m) => m.name === name && m.active);
    const now = new Date().toISOString();

    if (existingActive) {
      if (existingActive.dose === dose) {
        result = "unchanged";
        return store;
      }
      result = "updated";
      return {
        ...store,
        taperingEvents: [
          {
            id: generateId(),
            medicationName: name,
            date,
            newDose: dose ?? "(用量不明)",
            note: "お薬手帳/処方箋インポートによる自動記録",
            createdAt: now,
          },
          ...store.taperingEvents,
        ],
        registeredMedications: meds.map((m) => (m.id === existingActive.id ? { ...m, dose } : m)),
      };
    }

    const existingInactive = meds.find((m) => m.name === name && !m.active);
    if (existingInactive) {
      result = "resumed";
      return {
        ...store,
        taperingEvents: [
          {
            id: generateId(),
            medicationName: name,
            date,
            newDose: dose ?? "(用量不明)",
            note: "お薬手帳/処方箋インポートによる自動記録(再開)",
            createdAt: now,
          },
          ...store.taperingEvents,
        ],
        // 再処方なので処方開始日を今回読み取った日付に更新する
        registeredMedications: meds.map((m) =>
          m.id === existingInactive.id
            ? { ...m, active: true, endDate: undefined, startDate: date, dose }
            : m
        ),
      };
    }

    result = "created";
    return {
      ...store,
      registeredMedications: [
        {
          id: generateId(),
          name,
          dose,
          type: "regular",
          active: true,
          // 処方箋/お薬手帳から読み取った日付を処方開始日とする。
          // これによりバックフィル入力時、この日より前の対象日ではチェックリストに出ない
          startDate: date,
          createdAt: now,
        },
        ...meds,
      ],
    };
  });
  return saved ? result : "failed";
}

/** お薬手帳インポートで「リストに無くなった薬」を中止扱いにする(自動削除はしない)。保存できたらtrue */
export function discontinueRegisteredMedication(name: string, date: string): boolean {
  return updateStore((store) => {
    const existing = store.registeredMedications.find((m) => m.name === name && m.active);
    if (!existing) return store;
    return {
      ...store,
      registeredMedications: store.registeredMedications.map((m) =>
        m.id === existing.id ? { ...m, active: false, endDate: date } : m
      ),
      taperingEvents: [
        {
          id: generateId(),
          medicationName: name,
          date,
          newDose: "中止",
          note: "お薬手帳インポートによる自動記録",
          createdAt: new Date().toISOString(),
        },
        ...store.taperingEvents,
      ],
    };
  });
}
