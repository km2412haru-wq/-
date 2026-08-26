import { test } from "node:test";
import assert from "node:assert/strict";
import { truncateForPrompt, buildExplainPrompt } from "../lib/askClaude";

test("truncateForPrompt leaves short text untouched", () => {
  assert.equal(truncateForPrompt("短い文章"), "短い文章");
});

test("truncateForPrompt trims trailing/leading whitespace", () => {
  assert.equal(truncateForPrompt("  余白のある文章  "), "余白のある文章");
});

test("truncateForPrompt truncates long text and appends an ellipsis", () => {
  const long = "あ".repeat(1000);
  const result = truncateForPrompt(long, 500);
  assert.ok(result.length <= 501);
  assert.ok(result.endsWith("…"));
});

test("buildExplainPrompt includes the country name, section label, and source text", () => {
  const prompt = buildExplainPrompt("日本", "中世", "鎌倉幕府の成立。");
  assert.match(prompt, /日本/);
  assert.match(prompt, /中世/);
  assert.match(prompt, /鎌倉幕府の成立。/);
  assert.match(prompt, /文系大学生/);
});

test("buildExplainPrompt truncates a long source text", () => {
  const long = "あ".repeat(1000);
  const prompt = buildExplainPrompt("テスト国", "近代", long);
  assert.ok(prompt.length < 1000);
});
