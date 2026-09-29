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
/** 「持続発熱」とみなすのに必要な、観察窓内の発熱該当日数(通常時) */
const FEVER_DAYS = 3;
/** Aルート(発熱かつ倦怠感)で「持続倦怠感」とみなす倦怠感該当日数(通常時) */
const FATIGUE_DAYS_WITH_FEVER = 2;
/** Dルート(発熱を伴わない倦怠感の遷延)で単独発火に必要な倦怠感該当日数(通常時) */
const FATIGUE_DAYS_SOLO = 4;
const FERRITIN_THRESHOLD_NG_ML = 500;
const PLATELET_LOW_THRESHOLD = 100_000;
/**
 * WBCの低下側の閾値(/μL)。MAS等の血球減少や薬剤性の白血球減少を拾うためのもの。
 * 一般的な基準下限は約3,500〜4,000/μL、3,000/μL未満は高度の減少とされる。
 * 【要確認】暫定値。個人の平常値・使用中の薬(免疫抑制薬等)によって妥当な値が違うため、
 * 主治医に確認して置き換えること。
 * WBCの「高値」は単独では発火させない: AOSDの活動性でも上がるが、ステロイド服用中は
 * 普段から高いことが多く、常時警告が出ると本当の警告が埋もれる(警告疲れ)ため。
 */
const WBC_LOW_THRESHOLD = 3_500;
/**
 * AST・ALTの上昇側の閾値(U/L)。基準上限の約2.5倍(上限約40 U/L)にあたる保守的な値。
 * 肝障害はMAS・AOSD自体の活動性・薬剤性(NSAIDs・MTX等)のいずれでも起こるため、
 * 原因の切り分けは主治医に委ねる前提で「相談を検討」として出す。
 * 【要確認】暫定値。主治医の指示する基準があればそちらに置き換えること。
 */
const AST_HIGH_THRESHOLD = 100;
const ALT_HIGH_THRESHOLD = 100;
/** 直近の記録と直前数件の平均を比べ、平均強さがこれ以上上がっていたら急増とみなす(通常時) */
const JOINT_PAIN_SPIKE_SEVERITY_DELTA = 2;
/** 解熱薬服用中・要注意期間中に用いる、引き下げた急増デルタ */
const JOINT_PAIN_SPIKE_SEVERITY_DELTA_SENSITIVE = 1.5;
/** 関節痛の急増・新規部位を「意味あり」と扱うための最低強さ(これ未満の軽い痛みでは発火しない) */
const JOINT_PAIN_SIGNIFICANT_SEVERITY = 3;
/** 症状急変の比較ベースラインとして見る、直近より前の記録件数 */
const BASELINE_LOG_COUNT = 3;
/**
 * 発熱・倦怠感を数える観察窓(実際の今日を含む直近の暦日数)。
 * 「連続」ではなく暦日の窓にしているのは、記録のない日(スキップ・欠測)を
 * 「症状なし」として扱わず、かつ1日抜けただけで判定が途切れないようにするため。
 * 記録がある日だけを数え、記録がない日は分子にも分母にも入れない(dataQualityで別途知らせる)。
 */
const OBSERVATION_WINDOW_DAYS = 7;
/** 観察窓内でこの日数未満しか記録が無い場合、判定精度が下がっているとして知らせる */
const MIN_RECORDED_DAYS_FOR_CONFIDENCE = 4;
/** 症状の急変(ルートC)は、最新の記録がこの日数以内の時だけ評価する(古い記録を「今」の変化と扱わない) */
const STALE_LATEST_DAYS = 3;
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

/** 「記録がない」ことを「症状がない」と誤解しないための、判定の元になった記録の充足状況 */
export interface EmergencyDataQuality {
  windowDays: number;
  /** 観察窓内で、スキップされていない記録がある日数 */
  recordedDays: number;
  /** 観察窓内で記録が無い日数(スキップ・欠測。「症状なし」とは扱っていない) */
  missingDays: number;
  /** 記録が少なく判定精度が下がっているか */
  insufficient: boolean;
}

export interface EmergencyCheckResult {
  triggered: boolean;
  reasons: string[];
  reasonGroups: EmergencyReasonGroup[];
  /** 複数系統の検査値が同時に異常方向へ変化している(単独異常より強い注意喚起) */
  multipleLabAbnormal: boolean;
  dataQuality: EmergencyDataQuality;
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

/** 実際の今日から何日前か(今日=0、未来日は負) */
function daysAgo(today: string, target: string): number {
  return Math.round((new Date(today).getTime() - new Date(target).getTime()) / 86_400_000);
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

  // 観察窓(今日を含む直近OBSERVATION_WINDOW_DAYS暦日)の中で、記録がある日だけを数える。
  // 記録が無い日(スキップ・欠測)は「症状なし」とは扱わず、分子にも分母にも入れない。
  const windowLogs = nonSkipped.filter((l) => {
    const d = daysAgo(today, l.targetDate);
    return d >= 0 && d < OBSERVATION_WINDOW_DAYS;
  });
  const recordedDays = new Set(windowLogs.map((l) => l.targetDate)).size;
  const dataQuality: EmergencyDataQuality = {
    windowDays: OBSERVATION_WINDOW_DAYS,
    recordedDays,
    missingDays: OBSERVATION_WINDOW_DAYS - recordedDays,
    insufficient: recordedDays < MIN_RECORDED_DAYS_FOR_CONFIDENCE,
  };

  const feverDayCount = windowLogs.filter(
    (l) => typeof l.temperature === "number" && l.temperature >= feverThreshold
  ).length;
  const fatigueDayCount = windowLogs.filter((l) => l.fatigueUnusual).length;

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
      `直近${OBSERVATION_WINDOW_DAYS}日の記録で、${feverThreshold}℃以上の発熱が${feverDayCount}日、「普段と違う強い倦怠感」が${fatigueDayCount}日記録されています${suppressedNote}`
    );
  } else if (soloFatigue) {
    // --- ルートD: 発熱を伴わない倦怠感の遷延(発熱マスキングの本命) ---
    feverFatigueReasons.push(
      `発熱を伴わないものの、「普段と違う強い倦怠感」が直近${OBSERVATION_WINDOW_DAYS}日の記録で${fatigueDayCount}日と長く続いています${suppressedNote}`
    );
  }
  const routeD = !routeA && soloFatigue;

  // --- ルートB: 検査値異常(疎なデータなので直近窓から各項目の最新値を個別に探索) ---
  // フェリチン・血小板の単独判定は従来どおり維持し、WBC低下・AST/ALT上昇をOR条件として追加する。
  const latestLab = <K extends "ferritinNgMl" | "plateletsPerUl" | "wbcPerUl" | "astUL" | "altUL">(
    key: K
  ): number | undefined => {
    const v = nonSkipped.find((l) => typeof l.labs?.[key] === "number")?.labs?.[key];
    return typeof v === "number" ? v : undefined;
  };
  const latestFerritin = latestLab("ferritinNgMl");
  const latestPlatelets = latestLab("plateletsPerUl");
  const latestWbc = latestLab("wbcPerUl");
  const latestAst = latestLab("astUL");
  const latestAlt = latestLab("altUL");

  const labReasons: string[] = [];
  const abnormalLabSystems: string[] = [];
  if (typeof latestFerritin === "number" && latestFerritin >= FERRITIN_THRESHOLD_NG_ML) {
    labReasons.push(`直近の検査でフェリチン値が${latestFerritin}ng/mLと高値です`);
    abnormalLabSystems.push("フェリチン");
  }
  if (typeof latestPlatelets === "number" && latestPlatelets <= PLATELET_LOW_THRESHOLD) {
    labReasons.push(`直近の検査で血小板数が${latestPlatelets}/μLと低値です`);
    abnormalLabSystems.push("血小板");
  }
  if (typeof latestWbc === "number" && latestWbc <= WBC_LOW_THRESHOLD) {
    labReasons.push(`直近の検査でWBC(白血球)が${latestWbc}/μLと低値です`);
    abnormalLabSystems.push("WBC");
  }
  // AST・ALTは同じ肝機能の指標なので、両方上がっていても1系統として数える
  const astHigh = typeof latestAst === "number" && latestAst >= AST_HIGH_THRESHOLD;
  const altHigh = typeof latestAlt === "number" && latestAlt >= ALT_HIGH_THRESHOLD;
  if (astHigh || altHigh) {
    const parts = [
      astHigh ? `AST ${latestAst}U/L` : null,
      altHigh ? `ALT ${latestAlt}U/L` : null,
    ].filter(Boolean);
    labReasons.push(`直近の検査で肝酵素(${parts.join("・")})が高値です`);
    abnormalLabSystems.push("肝酵素");
  }
  // 複数系統が同時に異常方向へ変化している場合は、単独の異常より強い注意喚起として先頭に出す
  const multipleLabAbnormal = abnormalLabSystems.length >= 2;
  if (multipleLabAbnormal) {
    labReasons.unshift(
      `複数の検査値(${abnormalLabSystems.join("・")})に変化があります。主治医へ共有することを検討してください`
    );
  }
  const routeB = labReasons.length > 0;

  // --- ルートC: 症状の急変(関節痛の急増・重い新規部位・皮疹の新規出現) ---
  // ベースラインは直近の記録(latest)より前のBASELINE_LOG_COUNT件。
  // 最新の記録が古い(STALE_LATEST_DAYS超)場合は、その時点の変化を「今」の変化として扱わない
  const newest = nonSkipped[0];
  const latest =
    newest && daysAgo(today, newest.targetDate) <= STALE_LATEST_DAYS ? newest : undefined;
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

  return { triggered, reasons, reasonGroups, multipleLabAbnormal, dataQuality };
}
