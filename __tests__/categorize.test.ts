import { test } from "node:test";
import assert from "node:assert/strict";
import { categorize, isAiRelevant } from "../lib/categorize";

test("tags an acquisition headline as M&A", () => {
  const cats = categorize(
    "OpenAI acquires startup to boost enterprise search",
    "The deal, an all-stock acquisition, closed this week."
  );
  assert.ok(cats.includes("ma"));
});

test("tags a Japanese M&A headline", () => {
  const cats = categorize("AIスタートアップのX社、Y社を買収", "経営統合の一環として実施。");
  assert.ok(cats.includes("ma"));
});

test("tags an earnings headline as profit", () => {
  const cats = categorize(
    "Anthropic reports strong quarterly revenue growth",
    "Net income turned positive for the first time."
  );
  assert.ok(cats.includes("profit"));
});

test("tags a Japanese earnings headline as profit", () => {
  const cats = categorize("AI企業のZ社、決算で増益を発表", "営業利益は前年比20%増。");
  assert.ok(cats.includes("profit"));
});

test("tags a business-model headline", () => {
  const cats = categorize(
    "Company unveils new subscription pricing model",
    "The go-to-market strategy shifts to enterprise licensing."
  );
  assert.ok(cats.includes("business"));
});

test("falls back to 'other' when nothing matches", () => {
  const cats = categorize("New AI model beats benchmark", "It scores higher on reasoning tasks.");
  assert.deepEqual(cats, ["other"]);
});

test("a single item can carry multiple category tags", () => {
  const cats = categorize(
    "Startup acquired after pivoting business model, posts first profit",
    "The acquisition followed a strategy pivot and a profitable quarter."
  );
  assert.ok(cats.includes("ma"));
  assert.ok(cats.includes("business"));
  assert.ok(cats.includes("profit"));
});

test("word-boundary matching avoids false positives inside unrelated words", () => {
  // "ma" as a bare term isn't in the keyword list, but this guards the
  // matching approach: "Malaysia" must not trigger the M&A tag via "M&A"-like
  // substrings, and "AI" must not match inside "against" etc.
  const cats = categorize("Malaysia opens new data center", "A summary about infrastructure.");
  assert.deepEqual(cats, ["other"]);
});

test("isAiRelevant recognizes English and Japanese AI mentions", () => {
  assert.equal(isAiRelevant("New generative AI tool launches", ""), true);
  assert.equal(isAiRelevant("生成AIの新機能を発表", ""), true);
  assert.equal(isAiRelevant("Local bakery opens downtown", "Fresh bread daily."), false);
});
