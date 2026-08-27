import { test } from "node:test";
import assert from "node:assert/strict";
import { getRarity } from "../lib/rarity";

test("companies at or above 40B revenue are UR", () => {
  assert.equal(getRarity(130), "UR");
  assert.equal(getRarity(40), "UR");
});

test("companies just under a threshold fall to the lower tier", () => {
  assert.equal(getRarity(39.9), "SSR");
  assert.equal(getRarity(15), "SSR");
  assert.equal(getRarity(14.9), "SR");
  assert.equal(getRarity(5), "SR");
  assert.equal(getRarity(4.9), "R");
});

test("small/niche companies are R", () => {
  assert.equal(getRarity(2.1), "R");
  assert.equal(getRarity(0), "R");
});
