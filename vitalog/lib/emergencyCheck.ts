import { isInLifeStageTransitionWindow } from "@/lib/lifeStage";
import type { DailyLog, RegisteredMedication } from "@/types/vitalog";

/**
 * F10: MAS(マクロファージ活性化症候群)等の重篤合併症を疑うべきパターンの
 * ルールベース一次スクリーニング。
 *
 * 重要: これは「診断」ではなく「受診を検討すべきサイン」の提示に過ぎない。
 * 閾値(38℃, フェリチン500ng/mL, 血小板10万/μL等)は山口基準等の一般的な
 * 目安を参考にした暫定値であり、個人差・主治医の判断を置き換えるものではない。
 * F5/F11で蓄積データからの個人ベースライン学習ができるようになれば、
 * この暫定閾値をパーソナライズ閾値に置き換える。
 *
 * ## 発熱マスキングへの対応(設計の要)
 * ステロイド・NSAIDs・解熱鎮痛薬の服用中は発熱が薬理学的に抑制され、38℃まで
 * 上がらないまま病状が悪化しうる。つまり「発熱に依存した検知」は治療がうまくいって
 * いる時ほど見逃す。これを避けるため、以下の複数ルートを独立したOR条件にしている:
 *   A. 持続発熱 かつ 持続倦怠感(古典的パターン)
 *   B. 検査値異常(フェリチン高値 または 血小板低値)
 *   C. 症状の急変(関節痛の急増・重い新規部位・皮疹の新規出現)
 *   D. 発熱を伴わない倦怠感の遷延(発熱マスキングの本命ルート)
 * さらに、解熱作用のある薬をactiveに服用している場合(feverSuppressed)は、
 * 発熱閾値を下げ、非発熱ルートも敏感化する。
 */

/** 通常時の発熱判定閾値(℃) */
const FEVER_THRESHOLD_C = 38.0;
/** 解熱・抗炎症薬の服用中に用いる、引き下げた発熱判定閾値(℃) */
const FEVER_THRESHOLD_SUPPRESSED_C = 37.5;
/** 「持続発熱」とみなすのに必要な、直近ストリーク内の発熱該当日数(通常時) */
const FEVER_DAYS = 3;
/** Aルート(発熱かつ倦怠感)で「持続倦怠感」とみなす倦怠感該当日数(通常時) */
const FATIGUE_DAYS_WITH_FEVER = 2;
/** Dルート(発熱を伴わない倦怠感の遷延)で単独発火に必要な倦怠感該当日数(通常時) */
const FATIGUE_DAYS_SOLO = 4;
const FERRITIN_THRESHOLD_NG_ML = 500;
const PLATELET_LOW_THRESHOLD = 100_000;
/** 直近の記録と直前数件の平均を比べ、平均強さがこれ以上上がっていたら急増とみなす(通常時) */
const JOINT_PAIN_SPIKE_SEVERITY_DELTA = 2;
/** 解熱薬服用中・要注意期間中に用いる、引き下げた急増デルタ */
const JOINT_PAIN_SPIKE_SEVERITY_DELTA_SENSITIVE = 1.5;
/** 関節痛の急増・新規部位を「意味あり」と扱うための最低強さ(これ未満の軽い痛みでは発火しない) */
const JOINT_PAIN_SIGNIFICANT_SEVERITY = 3;
/** 症状急変の比較ベースラインとして見る、直近より前の記録件数 */
const BASELINE_LOG_COUNT = 3;
/** 直近ストリークとして遡って見る最大日数(閾値と切り離して固定する) */
const STREAK_MAX_DAYS = 7;
/**
 * 判定対象を実際の「今日」から見て直近この日数以内の記録に限定する。
 * これが無いと、過去の処方箋・検査結果を後から一括インポートした際に、
 * それが記録全体の中で最新の日付だった場合、何年も前の重い数値が
 * 「現在の状態」として誤って警告を出してしまう(発病当初のデータ等)。
 */
const EMERGENCY_LOOKBACK_DAYS = 14;

/**
 * 解熱・抗炎症作用があり発熱をマスクしうる薬の名前キーワード。
 * 登録済みの薬の名前に対する部分一致で判定する。これは発見的(heuristic)な判定であり、
 * 商品名・一般名の表記ゆれや未収載の薬は取りこぼす。取りこぼしても従来の発熱閾値で
 * 検知するだけで安全側に倒れる(取りこぼしで見逃しが増えるのは非発熱ルートが補う)。
 */
const FEVER_SUPPRESSING_MED_KEYWORDS = [
  // ステロイド
  "プレドニン",
  "プレドニゾロン",
  "プレドニゾロ",
  "ステロイド",
  "メドロール",
  "メチルプレドニ",
  "デカドロン",
  "デキサメタゾン",
  "リンデロン",
  "ベタメタゾン",
  // NSAIDs・解熱鎮痛
  "ロキソニン",
  "ロキソプロフェン",
  "ボルタレン",
  "ジクロフェナク",
  "セレコックス",
  "セレコキシブ",
  "ナイキサン",
  "ナプロキセン",
  "ブルフェン",
  "イブプロフェン",
  "カロナール",
  "アセトアミノフェン",
  "ロピオン",
  "NSAID",
];

export interface EmergencyReasonGroup {
  category: "発熱・倦怠感" | "検査値" | "症状の急変";
  reasons: string[];
}

export interface EmergencyCheckResult {
  triggered: boolean;
  reasons: string[];
  reasonGroups: EmergencyReasonGroup[];
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function hasRash(log: DailyLog | undefined): boolean {
  return !!(log?.rash?.note || log?.rash?.sourcePhotoId);
}

/**
 * 解熱・抗炎症薬をactiveに服用中かどうかを、登録済みの薬の名前から発見的に判定する。
 * 確実な判定ではない(表記ゆれ・未収載は取りこぼす)ため、あくまで感度調整のヒントとして使う。
 */
export function isOnFeverSuppressingMedication(
  registeredMedications: RegisteredMedication[]
): boolean {
  return registeredMedications.some(
    (m) => m.active && FEVER_SUPPRESSING_MED_KEYWORDS.some((kw) => m.name.includes(kw))
  );
}

/** 直近の記録から連続した(1日以上大きく空かない)日数分を取り出す */
function takeConsecutiveRecent(sortedDesc: DailyLog[], maxDays: number): DailyLog[] {
  const result: DailyLog[] = [];
  for (const log of sortedDesc) {
    if (result.length === 0) {
      result.push(log);
      continue;
    }
    const prev = result[result.length - 1];
    if (daysBetween(prev.targetDate, log.targetDate) <= 1.5) {
      result.push(log);
    } else {
      break;
    }
    if (result.length >= maxDays) break;
  }
  return result;
}

export function checkEmergency(
  dailyLogs: DailyLog[],
  registeredMedications: RegisteredMedication[] = []
): EmergencyCheckResult {
  // F12-4: ライフステージ移行の要注意期間中は、普段より敏感な閾値で検知する
  const inTransition = isInLifeStageTransitionWindow();
  // 解熱・抗炎症薬の服用中は発熱がマスクされうるため敏感化する
  const feverSuppressed = isOnFeverSuppressingMedication(registeredMedications);
  // どちらか一方でも該当すれば「敏感モード」として各閾値を1段引き下げる
  const sensitive = inTransition || feverSuppressed;

  const feverThreshold = feverSuppressed ? FEVER_THRESHOLD_SUPPRESSED_C : FEVER_THRESHOLD_C;
  const feverDaysThreshold = sensitive ? FEVER_DAYS - 1 : FEVER_DAYS;
  const fatigueWithFeverThreshold = sensitive ? FATIGUE_DAYS_WITH_FEVER - 1 : FATIGUE_DAYS_WITH_FEVER;
  const fatigueSoloThreshold = sensitive ? FATIGUE_DAYS_SOLO - 1 : FATIGUE_DAYS_SOLO;
  const jointSpikeDelta = sensitive
    ? JOINT_PAIN_SPIKE_SEVERITY_DELTA_SENSITIVE
    : JOINT_PAIN_SPIKE_SEVERITY_DELTA;

  const today = todayIso();
  const nonSkipped = dailyLogs
    .filter((l) => !l.skipped && daysBetween(l.targetDate, today) <= EMERGENCY_LOOKBACK_DAYS)
    .sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1));

  const recent = takeConsecutiveRecent(nonSkipped, STREAK_MAX_DAYS);

  const feverDayCount = recent.filter(
    (l) => typeof l.temperature === "number" && l.temperature >= feverThreshold
  ).length;
  const fatigueDayCount = recent.filter((l) => l.fatigueUnusual).length;

  const sustainedFever = feverDayCount >= feverDaysThreshold;
  const sustainedFatigueWithFever = fatigueDayCount >= fatigueWithFeverThreshold;
  const soloFatigue = fatigueDayCount >= fatigueSoloThreshold;

  const suppressedNote = feverSuppressed
    ? "(解熱・抗炎症薬の服用中のため発熱が出にくい前提で、通常より敏感な閾値で判定しています)"
    : inTransition
      ? "(ライフステージ移行の要注意期間中のため通常より敏感な閾値です)"
      : "";

  // --- ルートA: 持続発熱 かつ 持続倦怠感 ---
  const feverFatigueReasons: string[] = [];
  const routeA = sustainedFever && sustainedFatigueWithFever;
  if (routeA) {
    feverFatigueReasons.push(
      `直近で${feverThreshold}℃以上の発熱が${feverDayCount}日、「普段と違う強い倦怠感」が${fatigueDayCount}日記録されています${suppressedNote}`
    );
  } else if (soloFatigue) {
    // --- ルートD: 発熱を伴わない倦怠感の遷延(発熱マスキングの本命) ---
    feverFatigueReasons.push(
      `発熱を伴わないものの、「普段と違う強い倦怠感」が直近で${fatigueDayCount}日と長く続いています${suppressedNote}`
    );
  }
  const routeD = !routeA && soloFatigue;

  // --- ルートB: 検査値異常(疎なデータなので直近窓から各項目の最新値を個別に探索) ---
  const latestFerritin = nonSkipped.find((l) => typeof l.labs?.ferritinNgMl === "number")?.labs
    ?.ferritinNgMl;
  const latestPlatelets = nonSkipped.find((l) => typeof l.labs?.plateletsPerUl === "number")?.labs
    ?.plateletsPerUl;

  const labReasons: string[] = [];
  if (typeof latestFerritin === "number" && latestFerritin >= FERRITIN_THRESHOLD_NG_ML) {
    labReasons.push(`直近の検査でフェリチン値が${latestFerritin}ng/mLと高値です`);
  }
  if (typeof latestPlatelets === "number" && latestPlatelets <= PLATELET_LOW_THRESHOLD) {
    labReasons.push(`直近の検査で血小板数が${latestPlatelets}/μLと低値です`);
  }
  const routeB = labReasons.length > 0;

  // --- ルートC: 症状の急変(関節痛の急増・重い新規部位・皮疹の新規出現) ---
  // ベースラインは直近の記録(latest)より前のBASELINE_LOG_COUNT件。
  const latest = nonSkipped[0];
  const baseline = nonSkipped.slice(1, 1 + BASELINE_LOG_COUNT);
  const symptomChangeReasons: string[] = [];

  // 関節痛の急増・新規部位: 平均severityの比較にはベースラインが2件以上必要
  if (latest && latest.jointPain.length > 0 && baseline.length >= 2) {
    const latestAvg = average(latest.jointPain.map((p) => p.severity));
    const baselineAvgs = baseline
      .map((l) => average(l.jointPain.map((p) => p.severity)))
      .filter((v): v is number => v !== undefined);
    const baselineAvg = baselineAvgs.length ? average(baselineAvgs) : undefined;
    const latestMaxSeverity = Math.max(...latest.jointPain.map((p) => p.severity));

    const severitySpike =
      latestAvg !== undefined &&
      baselineAvg !== undefined &&
      latestAvg - baselineAvg >= jointSpikeDelta &&
      latestMaxSeverity >= JOINT_PAIN_SIGNIFICANT_SEVERITY;

    if (severitySpike) {
      symptomChangeReasons.push("関節痛の強さが直近の平均に比べて急に上がっています");
    }

    // 新規部位: ベースラインに無かった部位で、かつ強さがJOINT_PAIN_SIGNIFICANT_SEVERITY以上のもの
    const baselineSites = new Set(baseline.flatMap((l) => l.jointPain.map((p) => p.site)));
    const newSignificantSites = latest.jointPain
      .filter((p) => !baselineSites.has(p.site) && p.severity >= JOINT_PAIN_SIGNIFICANT_SEVERITY)
      .map((p) => p.site);
    if (newSignificantSites.length > 0) {
      symptomChangeReasons.push(
        `これまで無かった部位(${newSignificantSites.join("・")})に強い関節痛が出ています`
      );
    }
  }

  // 皮疹の新規出現: 比較できるベースライン(履歴)が1件以上ある時のみ
  if (latest && hasRash(latest) && baseline.length >= 1) {
    const hadRashBefore = baseline.some((l) => hasRash(l));
    if (!hadRashBefore) {
      symptomChangeReasons.push("これまで無かった皮疹が新しく記録されました");
    }
  }
  const routeC = symptomChangeReasons.length > 0;

  const triggered = routeA || routeB || routeC || routeD;

  const allGroups: EmergencyReasonGroup[] = [
    { category: "発熱・倦怠感", reasons: feverFatigueReasons },
    { category: "検査値", reasons: labReasons },
    { category: "症状の急変", reasons: symptomChangeReasons },
  ];
  const reasonGroups = allGroups.filter((g) => g.reasons.length > 0);

  const reasons = reasonGroups.flatMap((g) => g.reasons);

  return { triggered, reasons, reasonGroups };
}
