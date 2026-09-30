/**
 * フェリチン/ESR比(参考値)。
 *
 * 【出典の確認状況 — 一次資料は未確認】(最終確認: 2026-09-30)
 * - 閾値21.5は、小児の全身型若年性特発性関節炎(sJIA)に伴うMAS(マクロファージ活性化症候群)を
 *   見分ける指標として報告された値とする二次的な記述(総説の要約)までは確認できたが、
 *   原著論文の本文・対象集団・感度/特異度は、この開発環境から論文サイトに到達できず未確認。
 * - 同じ「フェリチン/ESR比」でも研究によってカットオフが異なる(sJIA新規発症でMASを見分ける
 *   基準として「>80」とする報告もある)。
 * - 成人AOSDでこの21.5が妥当かどうかは未確認・未検証。
 * したがって、この値は診断・判定の根拠ではなく「参考値」として表示するにとどめる。
 * F10(緊急検知)の判定には使わず、赤いバナーも出さない(未検証の閾値で「受診を検討」と
 * 言い切ると、誤報による警告疲れや過大な不安につながるため)。一次資料で成人AOSDへの
 * 適用が確認できた場合に限り、F10への組み込みを再検討すること。
 * 参考: Eloseily et al., ACR Open Rheumatology 2019(sJIA、ESR比の報告)
 */
export const FERRITIN_ESR_RATIO_REFERENCE = 21.5;

export interface FerritinEsrRatio {
  /** フェリチン(ng/mL) ÷ ESR(mm/h, 1時間値) */
  ratio: number;
  /** 参考値(21.5)を超えているか */
  exceeds: boolean;
}

/**
 * 同じ日の検査値のフェリチンとESRがどちらも入っている場合だけ比を計算する。
 * 別の日の値を組み合わせない(別の採血同士の比は意味を持たないため)。
 * ESRが0以下・フェリチンが0以下・数値でない場合は計算しない(0除算を避ける)。
 */
export function computeFerritinEsrRatio(
  labs: { ferritinNgMl?: number; esrMmH?: number } | undefined
): FerritinEsrRatio | null {
  const ferritin = labs?.ferritinNgMl;
  const esr = labs?.esrMmH;
  if (typeof ferritin !== "number" || typeof esr !== "number") return null;
  if (!Number.isFinite(ferritin) || !Number.isFinite(esr)) return null;
  if (ferritin <= 0 || esr <= 0) return null;
  const ratio = ferritin / esr;
  return { ratio, exceeds: ratio > FERRITIN_ESR_RATIO_REFERENCE };
}

export function formatRatio(ratio: number): string {
  return ratio.toFixed(2);
}

/** 参考値であること・出典の性質が伝わる注意書き(超過時) */
export const FERRITIN_ESR_EXCEED_NOTICE =
  `フェリチン/ESR比が${FERRITIN_ESR_RATIO_REFERENCE}を超えています。` +
  "これは参考値です(小児の全身型若年性特発性関節炎のMASで報告された基準で、" +
  "成人のAOSDでの有効性は確認できていません)。" +
  "他の検査値と併せて、主治医へ共有することを検討してください。";
