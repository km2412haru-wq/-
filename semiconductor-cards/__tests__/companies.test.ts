import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPANIES } from "../lib/companies";

test("every company has a unique id", () => {
  const ids = COMPANIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every rival id refers to a company that actually exists in the dataset", () => {
  const ids = new Set(COMPANIES.map((c) => c.id));
  for (const c of COMPANIES) {
    for (const rivalId of c.rivals) {
      assert.ok(ids.has(rivalId), `${c.id} lists unknown rival "${rivalId}"`);
    }
  }
});

test("no company lists itself as a rival", () => {
  for (const c of COMPANIES) {
    assert.ok(!c.rivals.includes(c.id), `${c.id} lists itself as a rival`);
  }
});

test("every company has at least one segment", () => {
  for (const c of COMPANIES) {
    assert.ok(c.segments.length > 0, `${c.id} has no segments`);
  }
});

test("numeric fields are within sane ranges", () => {
  for (const c of COMPANIES) {
    assert.ok(c.revenueUsdB > 0, `${c.id} revenue must be positive`);
    assert.ok(
      c.operatingMarginPct >= -100 && c.operatingMarginPct <= 100,
      `${c.id} margin out of range`
    );
    assert.ok(c.founded >= 1800 && c.founded <= 2026, `${c.id} founded year looks wrong`);
  }
});

test("colors are valid hex pairs", () => {
  const hex = /^#[0-9a-fA-F]{6}$/;
  for (const c of COMPANIES) {
    assert.equal(c.colors.length, 2, `${c.id} must have exactly 2 colors`);
    for (const color of c.colors) {
      assert.match(color, hex, `${c.id} has an invalid color "${color}"`);
    }
  }
});

test("both regions and a spread of segments are represented", () => {
  const regions = new Set(COMPANIES.map((c) => c.region));
  assert.ok(regions.has("global"));
  assert.ok(regions.has("japan"));

  const segments = new Set(COMPANIES.flatMap((c) => c.segments));
  for (const s of ["idm", "fabless", "foundry", "memory", "equipment", "materials", "eda", "ip"]) {
    assert.ok(segments.has(s as never), `no company covers segment "${s}"`);
  }
});
