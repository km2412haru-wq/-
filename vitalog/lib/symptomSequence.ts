import { UNSPECIFIED_SYMPTOM_NAME } from "@/lib/symptomStats";
import type { DailyLog } from "@/types/vitalog";

/**
 * 前駆症状の順列(例: 喉の痛み → 倦怠感 → 関節痛 → 発熱)を、後から分析できるようにするための
 * 派生ロジック。保存するのは日次記録と、症状ごとの任意の`onsetDate`(その症状が始まった日)だけで、
 * ここで作るイベント・エピソード・順列は毎回の計算で導く(保存しない)。
 * そのため、区切りの日数などの分析ルールを変えても、保存データの移行は要らない。
 *
 * 粒度は日単位。同じ日に始まった症状の前後は区別しない(区別するには時刻入力が要り、
 * 体調が悪い日の入力負荷が大きすぎるため)。
 *
 * 【F10には組み込まない】パターンが未知のまま順列で発火させると、風邪でも起きる
 * 「喉の痛み→倦怠感→関節痛」で誤報が増え、警告疲れで本当の警告が埋もれるため。
 * 過去の再燃エピソードを見て、パターンが確認できてから組み込みを検討する。
 */

export type OnsetKind = "symptom" | "fever" | "fatigue" | "jointPain" | "rash";

export interface OnsetEvent {
  kind: OnsetKind;
  /** 表示名(症状名、または「発熱」「倦怠感」「関節痛」「皮疹」) */
  name: string;
  /** その症状が始まった日(YYYY-MM-DD) */
  onsetDate: string;
  /**
   * declared: 利用者が「いつから」で申告した日 / derived: 記録上の初出日から導いた日。
   * 毎日記録していない人では、derivedは実際の発症より遅く出るため、分析時に確度を分けて扱う。
   */
  source: "declared" | "derived";
}

export interface SequenceStep {
  date: string;
  names: string[];
}

/** 発熱として数える体温(℃)。F10の判定閾値とは独立した、順列用の目安 */
const FEVER_ONSET_C = 38.0;
/** 同じ症状で、この日数より長く記録上の出現が途切れたら、別の発症(再発)とみなす */
export const RUN_GAP_DAYS = 3;
/** 発症日の間隔がこの日数以内なら、同じ再燃エピソードとみなす */
export const EPISODE_GAP_DAYS = 7;
/** 申告された発症日が、記録日よりこの日数より前なら、誤入力の可能性があるため採用しない */
const MAX_DECLARED_LOOKBACK_DAYS = 60;

const KIND_LABEL: Record<Exclude<OnsetKind, "symptom">, string> = {
  fever: "発熱",
  fatigue: "倦怠感",
  jointPain: "関節痛",
  rash: "皮疹",
};

function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

/** ある項目の1回の出現(記録日と、申告された発症日) */
interface Presence {
  date: string;
  declaredOnset?: string;
}

/**
 * 記録から、項目ごとの出現日を集める。簡易入力(quick)の記録は、聞いていない項目
 * (関節痛・皮疹)を「なし」とは扱えないので、出現していれば数え、無ければ何も言わない
 * (出現日だけを見る方式なので、記録が無い日は途切れの判定にしか使われない)。
 */
function collectPresence(logs: DailyLog[]): Map<string, { kind: OnsetKind; name: string; presences: Presence[] }> {
  const items = new Map<string, { kind: OnsetKind; name: string; presences: Presence[] }>();
  const add = (key: string, kind: OnsetKind, name: string, p: Presence) => {
    const item = items.get(key) ?? { kind, name, presences: [] };
    item.presences.push(p);
    items.set(key, item);
  };

  for (const log of logs) {
    if (log.skipped) continue;
    for (const s of log.symptoms) {
      if (s.name === UNSPECIFIED_SYMPTOM_NAME) continue;
      add(`symptom:${s.name}`, "symptom", s.name, { date: log.targetDate, declaredOnset: s.onsetDate });
    }
    if (typeof log.temperature === "number" && log.temperature >= FEVER_ONSET_C) {
      add("fever", "fever", KIND_LABEL.fever, { date: log.targetDate });
    }
    if (log.fatigueUnusual) add("fatigue", "fatigue", KIND_LABEL.fatigue, { date: log.targetDate });
    if (log.jointPain.length > 0) add("jointPain", "jointPain", KIND_LABEL.jointPain, { date: log.targetDate });
    if (log.rash?.note || log.rash?.sourcePhotoId) {
      add("rash", "rash", KIND_LABEL.rash, { date: log.targetDate });
    }
  }
  return items;
}

/**
 * 各項目について、出現の「かたまり」(出現日の間隔がRUN_GAP_DAYS以内)ごとに1つの発症イベントを作る。
 * かたまりの最初の出現に申告された発症日があり、それが妥当(出現日以前・60日以内)なら採用する。
 * 結果は発症日の昇順。
 */
export function deriveOnsetEvents(logs: DailyLog[]): OnsetEvent[] {
  const events: OnsetEvent[] = [];

  for (const item of collectPresence(logs).values()) {
    const sorted = [...item.presences].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let runStart: Presence | null = null;
    let prev: Presence | null = null;

    const flush = () => {
      if (!runStart) return;
      const declared = runStart.declaredOnset;
      const valid =
        declared !== undefined &&
        declared <= runStart.date &&
        dayNumber(runStart.date) - dayNumber(declared) <= MAX_DECLARED_LOOKBACK_DAYS;
      events.push({
        kind: item.kind,
        name: item.name,
        onsetDate: valid ? (declared as string) : runStart.date,
        source: valid ? "declared" : "derived",
      });
    };

    for (const p of sorted) {
      if (prev && dayNumber(p.date) - dayNumber(prev.date) > RUN_GAP_DAYS) {
        flush();
        runStart = p;
      } else if (!runStart) {
        runStart = p;
      }
      prev = p;
    }
    flush();
  }

  return events.sort((a, b) =>
    a.onsetDate < b.onsetDate ? -1 : a.onsetDate > b.onsetDate ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );
}

/** 発症日が近いイベントを、同じ再燃エピソードにまとめる(発症日の昇順を前提にしない) */
export function groupIntoEpisodes(events: OnsetEvent[], gapDays: number = EPISODE_GAP_DAYS): OnsetEvent[][] {
  const sorted = [...events].sort((a, b) => (a.onsetDate < b.onsetDate ? -1 : a.onsetDate > b.onsetDate ? 1 : 0));
  const episodes: OnsetEvent[][] = [];
  let last: OnsetEvent | null = null;
  for (const e of sorted) {
    if (last && dayNumber(e.onsetDate) - dayNumber(last.onsetDate) <= gapDays) {
      episodes[episodes.length - 1].push(e);
    } else {
      episodes.push([e]);
    }
    last = e;
  }
  return episodes;
}

/** エピソードを、発症日ごとの段(同じ日に始まったものは同じ段)に並べる */
export function toSequence(episode: OnsetEvent[]): SequenceStep[] {
  const byDate = new Map<string, string[]>();
  for (const e of episode) {
    const names = byDate.get(e.onsetDate) ?? [];
    if (!names.includes(e.name)) names.push(e.name);
    byDate.set(e.onsetDate, names);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, names]) => ({ date, names: [...names].sort() }));
}

/** 「咽頭痛 → 倦怠感・発熱 → 関節痛」のような表示用の文字列(同じ日の症状は「・」でつなぐ) */
export function sequenceLabel(steps: SequenceStep[]): string {
  return steps.map((s) => s.names.join("・")).join(" → ");
}
