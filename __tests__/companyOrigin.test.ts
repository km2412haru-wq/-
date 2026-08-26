import { test } from "node:test";
import assert from "node:assert/strict";
import { detectOrigin } from "../lib/companyOrigin";

test("tags an article about a Japanese company as jp", () => {
  const origins = detectOrigin(
    "SoftBank announces new AI investment fund",
    "The fund will back domestic AI startups."
  );
  assert.deepEqual(origins, ["jp"]);
});

test("tags a Japanese-language article about a Japanese company as jp", () => {
  const origins = detectOrigin("ソフトバンク、AI企業に出資", "国内AIスタートアップへの投資を強化。");
  assert.deepEqual(origins, ["jp"]);
});

test("tags an article about an overseas company as overseas", () => {
  const origins = detectOrigin(
    "OpenAI raises new funding round",
    "The round values the company at a record high."
  );
  assert.deepEqual(origins, ["overseas"]);
});

test("tags an article mentioning both a jp and overseas company as both", () => {
  const origins = detectOrigin(
    "SoftBank deepens partnership with OpenAI",
    "The Japanese conglomerate expands its stake in the US AI lab."
  );
  assert.ok(origins.includes("jp"));
  assert.ok(origins.includes("overseas"));
});

test("returns an empty array when no known company is mentioned", () => {
  const origins = detectOrigin("New open-source model tops leaderboard", "No company named here.");
  assert.deepEqual(origins, []);
});

test("word-boundary matching avoids false positives (e.g. 'Meta' inside another word)", () => {
  const origins = detectOrigin("Metadata pipeline improves search relevance", "A summary about infrastructure.");
  assert.deepEqual(origins, []);
});
