import { test } from "node:test";
import assert from "node:assert/strict";
import { filterCompanies, sortCompanies } from "../lib/filter";
import { COMPANIES } from "../lib/companies";

test("filters by segment", () => {
  const result = filterCompanies(COMPANIES, { segment: "foundry", region: "all", query: "" });
  assert.ok(result.length > 0);
  assert.ok(result.every((c) => c.segments.includes("foundry")));
  assert.ok(result.some((c) => c.id === "tsmc"));
});

test("filters by region", () => {
  const result = filterCompanies(COMPANIES, { segment: "all", region: "japan", query: "" });
  assert.ok(result.length > 0);
  assert.ok(result.every((c) => c.region === "japan"));
});

test("filters by free-text query, case-insensitively, across name/country/tagline", () => {
  const byEnglishName = filterCompanies(COMPANIES, { segment: "all", region: "all", query: "tsmc" });
  assert.ok(byEnglishName.some((c) => c.id === "tsmc"));

  const byJapaneseName = filterCompanies(COMPANIES, { segment: "all", region: "all", query: "東京エレクトロン" });
  assert.ok(byJapaneseName.some((c) => c.id === "tel"));

  const byCountry = filterCompanies(COMPANIES, { segment: "all", region: "all", query: "オランダ" });
  assert.ok(byCountry.some((c) => c.id === "asml"));
});

test("empty query returns everything within the segment/region filter", () => {
  const result = filterCompanies(COMPANIES, { segment: "all", region: "all", query: "" });
  assert.equal(result.length, COMPANIES.length);
});

test("sortCompanies by revenue is descending", () => {
  const sorted = sortCompanies(COMPANIES, "revenue");
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i - 1].revenueUsdB >= sorted[i].revenueUsdB);
  }
});

test("sortCompanies by name uses Japanese locale ordering and doesn't mutate the input", () => {
  const before = COMPANIES.map((c) => c.id);
  sortCompanies(COMPANIES, "name");
  assert.deepEqual(
    COMPANIES.map((c) => c.id),
    before
  );
});
