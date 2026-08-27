import { test } from "node:test";
import assert from "node:assert/strict";
import { battle, computeBattleScore } from "../lib/battle";
import type { Company } from "../lib/types";

function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: "x",
    name: "X",
    nameJa: "エックス",
    country: "米国",
    flag: "🇺🇸",
    region: "global",
    segments: ["fabless"],
    revenueUsdB: 10,
    operatingMarginPct: 20,
    founded: 2000,
    hq: "どこか",
    tagline: "",
    businessModel: "",
    strengths: [],
    rivals: [],
    colors: ["#000000", "#111111"],
    ...overrides,
  };
}

test("a bigger, more profitable company scores higher", () => {
  const giant = makeCompany({ id: "giant", revenueUsdB: 130, operatingMarginPct: 55 });
  const niche = makeCompany({ id: "niche", revenueUsdB: 2.1, operatingMarginPct: 15 });
  assert.ok(computeBattleScore(giant) > computeBattleScore(niche));
});

test("battle() picks the higher-scoring company as winner", () => {
  const giant = makeCompany({ id: "giant", revenueUsdB: 130, operatingMarginPct: 55 });
  const niche = makeCompany({ id: "niche", revenueUsdB: 2.1, operatingMarginPct: 15 });
  const result = battle(giant, niche);
  assert.equal(result.winnerId, "giant");
  assert.ok(result.scoreA > result.scoreB);
});

test("battle() reports a draw when scores tie", () => {
  const a = makeCompany({ id: "a", revenueUsdB: 10, operatingMarginPct: 20 });
  const b = makeCompany({ id: "b", revenueUsdB: 10, operatingMarginPct: 20 });
  const result = battle(a, b);
  assert.equal(result.winnerId, null);
  assert.equal(result.scoreA, result.scoreB);
});

test("battle score is never negative for a loss-making company", () => {
  const lossmaker = makeCompany({ id: "loss", revenueUsdB: 53, operatingMarginPct: 2 });
  assert.ok(computeBattleScore(lossmaker) >= 0);
});
