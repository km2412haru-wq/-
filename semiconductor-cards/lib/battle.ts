import type { Company } from "./types";
import { getRarity } from "./rarity";

const RARITY_BONUS: Record<string, number> = { UR: 20, SSR: 10, SR: 5, R: 0 };

/**
 * カード対戦（比較モード）用の「総合力」スコア。
 * 売上規模（対数スケールで頭打ち感を出す）＋営業利益率＋レア度ボーナスの合算。
 * ゲーム的な演出のための指標であり、企業価値の実際の優劣を示すものではない。
 */
export function computeBattleScore(company: Company): number {
  const revenuePower = Math.log10(Math.max(company.revenueUsdB, 0) + 1) * 20;
  const marginPower = Math.max(company.operatingMarginPct, 0);
  const rarityBonus = RARITY_BONUS[getRarity(company.revenueUsdB)] ?? 0;
  return Math.round(revenuePower + marginPower + rarityBonus);
}

export type BattleResult = {
  winnerId: string | null; // null = 引き分け
  scoreA: number;
  scoreB: number;
};

export function battle(a: Company, b: Company): BattleResult {
  const scoreA = computeBattleScore(a);
  const scoreB = computeBattleScore(b);
  if (scoreA === scoreB) return { winnerId: null, scoreA, scoreB };
  return { winnerId: scoreA > scoreB ? a.id : b.id, scoreA, scoreB };
}
