import type { Rarity } from "./types";

// 売上高の規模感でレア度を決める。トレカらしい演出のためのラベル付けであり、
// 企業としての優劣を意味するものではない（ニッチ市場の専業企業ほどRになりがち）。
const THRESHOLDS: { min: number; rarity: Rarity }[] = [
  { min: 40, rarity: "UR" },
  { min: 15, rarity: "SSR" },
  { min: 5, rarity: "SR" },
  { min: 0, rarity: "R" },
];

export function getRarity(revenueUsdB: number): Rarity {
  for (const { min, rarity } of THRESHOLDS) {
    if (revenueUsdB >= min) return rarity;
  }
  return "R";
}

export const RARITY_LABELS: Record<Rarity, string> = {
  UR: "UR（超希少）",
  SSR: "SSR",
  SR: "SR",
  R: "R",
};

export const RARITY_ORDER: Rarity[] = ["UR", "SSR", "SR", "R"];
