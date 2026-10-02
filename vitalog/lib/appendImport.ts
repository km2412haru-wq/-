import { generateId } from "@/lib/id";
import { updateStore } from "@/lib/storage";
import {
  MEDICATION_TYPES,
  type DailyLog,
  type MedicationType,
  type RegisteredMedication,
  type TaperingEvent,
  type VitalogStore,
} from "@/types/vitalog";

/**
 * 追記インポート: 検査値・薬の履歴を、既存の記録を消さずに足す。
 * JSONの復元(importStoreFromJson)はストア全体の置き換えなので、これは別の経路。
 *
 * 方針:
 *  - 既存の値は上書きしない。同じ日に違う値がある検査値は「衝突」として一覧に出し、取り込まない。
 *  - 記録の無い日には「検査値のみ(labsOnly)」の記録を作る(症状なしの記録日として数えない)。
 *  - 日付・用量は、ファイルに書かれたものだけを使う(推測で補わない)。
 *  - 適用は1回のupdateStoreで行う(全部入るか、何も変わらないか)。
 *  - 同じファイルを再度取り込んでも重複しない(同じ値は「既にある」としてスキップ)。
 *  - 取り込みごとに台帳(vitalog:import-ledger)へ記録し、後から取り消せる。
 *  - 個人のデータ(ファイルの中身)はこのコードに含めない。ファイルは端末で読み込む。
 */

export const APPEND_BUNDLE_FORMAT = "vitalog-append-v1";
const LEDGER_KEY = "vitalog:import-ledger";
const MAX_ITEMS = 500;
const MAX_LEDGER_ENTRIES = 20;

export const LAB_KEYS = [
  "wbcPerUl",
  "plateletsPerUl",
  "ferritinNgMl",
  "crpMgDl",
  "astUL",
  "altUL",
  "esrMmH",
] as const;
export type LabKey = (typeof LAB_KEYS)[number];
export type LabValues = Partial<Record<LabKey, number>>;

export interface AppendBundle {
  format: typeof APPEND_BUNDLE_FORMAT;
  labs: { date: string; labs: LabValues }[];
  medications: {
    name: string;
    dose?: string;
    type: MedicationType;
    active: boolean;
    startDate?: string;
    endDate?: string;
  }[];
  taperingEvents: { medicationName: string; date: string; newDose: string; note?: string }[];
}

export type ParseResult = { ok: true; bundle: AppendBundle } | { ok: false; message: string };

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

function isText(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

/** ファイルの中身を検証して取り込み用の形にする(外部から来たデータなので、全項目を厳密に確認する) */
export function parseAppendBundle(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, message: "JSONとして読めませんでした" };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, message: "ファイルの形式が違います" };
  }
  const d = data as Record<string, unknown>;
  if (d.format !== APPEND_BUNDLE_FORMAT) {
    return { ok: false, message: "追記インポート用のファイルではありません(バックアップの復元は別の機能です)" };
  }
  const list = (key: string): unknown[] | null => {
    const v = d[key];
    if (v === undefined) return [];
    return Array.isArray(v) && v.length <= MAX_ITEMS ? v : null;
  };
  const rawLabs = list("labs");
  const rawMeds = list("medications");
  const rawEvents = list("taperingEvents");
  if (!rawLabs || !rawMeds || !rawEvents) {
    return { ok: false, message: `項目の数が多すぎるか、形式が不正です(各${MAX_ITEMS}件まで)` };
  }

  const bundle: AppendBundle = { format: APPEND_BUNDLE_FORMAT, labs: [], medications: [], taperingEvents: [] };

  for (const [i, item] of rawLabs.entries()) {
    const o = item as { date?: unknown; labs?: unknown };
    if (!isIsoDate(o?.date) || typeof o.labs !== "object" || o.labs === null) {
      return { ok: false, message: `検査値の${i + 1}件目: 日付(YYYY-MM-DD)または値の形式が不正です` };
    }
    const values: LabValues = {};
    for (const [k, v] of Object.entries(o.labs as Record<string, unknown>)) {
      if (!(LAB_KEYS as readonly string[]).includes(k)) {
        return { ok: false, message: `検査値の${i + 1}件目: 未対応の項目「${k}」があります` };
      }
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10_000_000) {
        return { ok: false, message: `検査値の${i + 1}件目: 「${k}」の値が不正です` };
      }
      values[k as LabKey] = v;
    }
    if (Object.keys(values).length === 0) continue;
    bundle.labs.push({ date: o.date, labs: values });
  }

  for (const [i, item] of rawMeds.entries()) {
    const o = item as Record<string, unknown>;
    const type = o?.type;
    if (!isText(o?.name, 200) || !(MEDICATION_TYPES as readonly unknown[]).includes(type) || typeof o.active !== "boolean") {
      return { ok: false, message: `薬の${i + 1}件目: 名前・種別・activeのいずれかが不正です` };
    }
    if (o.dose !== undefined && !isText(o.dose, 300)) {
      return { ok: false, message: `薬の${i + 1}件目: 用量が不正です` };
    }
    for (const k of ["startDate", "endDate"] as const) {
      if (o[k] !== undefined && !isIsoDate(o[k])) {
        return { ok: false, message: `薬の${i + 1}件目: ${k}の日付が不正です` };
      }
    }
    bundle.medications.push({
      name: (o.name as string).trim(),
      dose: o.dose as string | undefined,
      type: type as MedicationType,
      active: o.active,
      startDate: o.startDate as string | undefined,
      endDate: o.endDate as string | undefined,
    });
  }

  for (const [i, item] of rawEvents.entries()) {
    const o = item as Record<string, unknown>;
    if (!isText(o?.medicationName, 200) || !isIsoDate(o.date) || !isText(o.newDose, 500)) {
      return { ok: false, message: `用量変更の${i + 1}件目: 薬名・日付・用量が不正です` };
    }
    if (o.note !== undefined && !isText(o.note, 500)) {
      return { ok: false, message: `用量変更の${i + 1}件目: メモが不正です` };
    }
    bundle.taperingEvents.push({
      medicationName: (o.medicationName as string).trim(),
      date: o.date,
      newDose: (o.newDose as string).trim(),
      note: o.note as string | undefined,
    });
  }

  return { ok: true, bundle };
}

/** 薬名の同一判定用(全角半角・大文字小文字・空白の違いを無視する) */
export function normalizeMedName(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export type PlanStatus = "add" | "merge" | "same" | "conflict";

export interface PlanItem {
  kind: "検査値" | "薬" | "用量変更";
  label: string;
  status: PlanStatus;
  detail?: string;
}

export interface AppendPlan {
  items: PlanItem[];
  /** 追加される件数(add + merge) */
  willChange: number;
  conflicts: number;
}

interface LedgerEntry {
  batchId: string;
  at: string;
  createdLogIds: string[];
  mergedLabs: { logId: string; values: LabValues }[];
  createdMedicationIds: string[];
  createdEventIds: string[];
}

function pickLogForDate(logs: DailyLog[], date: string): DailyLog | undefined {
  const sameDay = logs.filter((l) => l.targetDate === date && !l.skipped);
  return sameDay.find((l) => !l.labsOnly) ?? sameDay[0];
}

/** ストアに適用した結果(新しいストアと、取り消し用の台帳、計画)を計算する。副作用なし */
export function computeAppendImport(
  store: VitalogStore,
  bundle: AppendBundle,
  now: string = new Date().toISOString()
): { store: VitalogStore; plan: AppendPlan; ledger: LedgerEntry } {
  const items: PlanItem[] = [];
  const ledger: LedgerEntry = {
    batchId: generateId(),
    at: now,
    createdLogIds: [],
    mergedLabs: [],
    createdMedicationIds: [],
    createdEventIds: [],
  };

  let dailyLogs = store.dailyLogs;
  for (const entry of bundle.labs) {
    const existing = pickLogForDate(dailyLogs, entry.date);
    if (!existing) {
      const log: DailyLog = {
        id: generateId(),
        targetDate: entry.date,
        recordedAt: now,
        createdAt: now,
        updatedAt: now,
        skipped: false,
        labsOnly: true,
        jointPain: [],
        symptoms: [],
        moodReasonTags: [],
        activityTags: [],
        medications: [],
        topicalMedications: [],
        labs: { ...entry.labs },
      };
      dailyLogs = [...dailyLogs, log];
      ledger.createdLogIds.push(log.id);
      items.push({ kind: "検査値", label: entry.date, status: "add", detail: `${Object.keys(entry.labs).length}項目(検査値のみの記録を新規作成)` });
      continue;
    }
    const current = existing.labs ?? {};
    const toAdd: LabValues = {};
    const conflicts: string[] = [];
    let same = 0;
    for (const key of Object.keys(entry.labs) as LabKey[]) {
      const incoming = entry.labs[key] as number;
      const have = current[key];
      if (have === undefined) toAdd[key] = incoming;
      else if (have === incoming) same += 1;
      else conflicts.push(`${key}(既存${have} / ファイル${incoming})`);
    }
    const addCount = Object.keys(toAdd).length;
    if (addCount > 0) {
      dailyLogs = dailyLogs.map((l) =>
        l.id === existing.id ? { ...l, labs: { ...l.labs, ...toAdd }, updatedAt: now } : l
      );
      ledger.mergedLabs.push({ logId: existing.id, values: toAdd });
    }
    const status: PlanStatus = conflicts.length > 0 ? "conflict" : addCount > 0 ? "merge" : "same";
    const parts = [
      addCount > 0 ? `${addCount}項目を追記` : null,
      same > 0 ? `${same}項目は既に同じ値` : null,
      conflicts.length > 0 ? `衝突(取り込まない): ${conflicts.join("、")}` : null,
    ].filter(Boolean);
    items.push({ kind: "検査値", label: entry.date, status, detail: parts.join(" / ") });
  }

  let registeredMedications = store.registeredMedications;
  for (const m of bundle.medications) {
    const key = normalizeMedName(m.name);
    const existing = registeredMedications.find((r) => normalizeMedName(r.name) === key);
    if (existing) {
      const differs = (m.dose ?? "") !== (existing.dose ?? "") || m.active !== existing.active;
      items.push({
        kind: "薬",
        label: m.name,
        status: differs ? "conflict" : "same",
        detail: differs ? "既に登録済みで内容が違います(既存を変更しません)" : "既に登録済み",
      });
      continue;
    }
    const med: RegisteredMedication = {
      id: generateId(),
      name: m.name,
      dose: m.dose,
      type: m.type,
      active: m.active,
      startDate: m.startDate,
      endDate: m.endDate,
      createdAt: now,
    };
    registeredMedications = [med, ...registeredMedications];
    ledger.createdMedicationIds.push(med.id);
    items.push({ kind: "薬", label: m.name, status: "add", detail: m.active ? "服用中として登録" : "終了済みとして登録" });
  }

  let taperingEvents = store.taperingEvents;
  for (const e of bundle.taperingEvents) {
    const key = normalizeMedName(e.medicationName);
    const dup = taperingEvents.find(
      (x) => normalizeMedName(x.medicationName) === key && x.date === e.date && x.newDose === e.newDose
    );
    if (dup) {
      items.push({ kind: "用量変更", label: `${e.date} ${e.medicationName}`, status: "same", detail: "既に同じ記録があります" });
      continue;
    }
    const ev: TaperingEvent = {
      id: generateId(),
      medicationName: e.medicationName,
      date: e.date,
      newDose: e.newDose,
      note: e.note,
      createdAt: now,
    };
    taperingEvents = [ev, ...taperingEvents];
    ledger.createdEventIds.push(ev.id);
    items.push({ kind: "用量変更", label: `${e.date} ${e.medicationName}`, status: "add" });
  }

  const willChange = items.filter((i) => i.status === "add" || i.status === "merge").length;
  const conflicts = items.filter((i) => i.status === "conflict").length;
  return {
    store: { ...store, dailyLogs, registeredMedications, taperingEvents },
    plan: { items, willChange, conflicts },
    ledger,
  };
}

/** 画面に見せる計画(現在のストアに対して適用した場合の結果)。保存はしない */
export function planAppendImport(store: VitalogStore, bundle: AppendBundle): AppendPlan {
  return computeAppendImport(store, bundle).plan;
}

function readLedger(): LedgerEntry[] {
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLedger(entries: LedgerEntry[]): void {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, MAX_LEDGER_ENTRIES)));
  } catch (err) {
    console.error("取り込み履歴の保存に失敗しました:", err);
  }
}

export function getLastImportBatch(): { batchId: string; at: string } | null {
  if (typeof window === "undefined") return null;
  const last = readLedger()[0];
  return last ? { batchId: last.batchId, at: last.at } : null;
}

export type ApplyResult = { ok: true; plan: AppendPlan; batchId: string } | { ok: false; message: string };

/** 追記インポートを適用する。1回のupdateStoreで、全部入るか何も変わらないか */
export function applyAppendImport(bundle: AppendBundle): ApplyResult {
  let result: { plan: AppendPlan; ledger: LedgerEntry } | null = null;
  const saved = updateStore((store) => {
    const computed = computeAppendImport(store, bundle);
    result = { plan: computed.plan, ledger: computed.ledger };
    return computed.store;
  });
  if (!saved || !result) {
    return { ok: false, message: "保存できませんでした。何も変更していません。保存容量を確認してください" };
  }
  const done = result as { plan: AppendPlan; ledger: LedgerEntry };
  if (done.plan.willChange > 0) writeLedger([done.ledger, ...readLedger()]);
  return { ok: true, plan: done.plan, batchId: done.ledger.batchId };
}

/** 直前の取り込みを取り消す。取り込み後に変えられた値は消さない(同じ値のときだけ消す) */
export function undoLastAppendImport(): { ok: true } | { ok: false; message: string } {
  const ledger = readLedger();
  const last = ledger[0];
  if (!last) return { ok: false, message: "取り消せる取り込みがありません" };
  const saved = updateStore((store) => {
    const dailyLogs = store.dailyLogs
      // 取り込みで作った「検査値のみ」の記録は消す(取り込み後に他の内容が加わっていれば残す)
      .filter((l) => !(last.createdLogIds.includes(l.id) && l.labsOnly && l.medications.length === 0))
      .map((l) => {
        const merged = last.mergedLabs.find((m) => m.logId === l.id);
        if (!merged || !l.labs) return l;
        const labs = { ...l.labs } as Record<string, number | string | undefined>;
        for (const [k, v] of Object.entries(merged.values)) {
          if (labs[k] === v) delete labs[k];
        }
        return { ...l, labs: labs as DailyLog["labs"] };
      });
    return {
      ...store,
      dailyLogs,
      registeredMedications: store.registeredMedications.filter((m) => !last.createdMedicationIds.includes(m.id)),
      taperingEvents: store.taperingEvents.filter((e) => !last.createdEventIds.includes(e.id)),
    };
  });
  if (!saved) return { ok: false, message: "保存できませんでした。何も変更していません" };
  writeLedger(ledger.slice(1));
  return { ok: true };
}
