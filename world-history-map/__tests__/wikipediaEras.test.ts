import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyEra, parseSections, groupIntoEras } from "../lib/wikipedia";

test("classifyEra buckets ancient/prehistoric headings", () => {
  assert.equal(classifyEra("先史時代"), "prehistoric");
  assert.equal(classifyEra("古代"), "prehistoric");
  assert.equal(classifyEra("旧石器時代"), "prehistoric");
});

test("classifyEra buckets medieval headings", () => {
  assert.equal(classifyEra("中世"), "medieval");
  assert.equal(classifyEra("中世の混乱期"), "medieval");
});

test("classifyEra buckets modern/contemporary headings", () => {
  assert.equal(classifyEra("近代"), "modern");
  assert.equal(classifyEra("現代"), "modern");
  assert.equal(classifyEra("独立後の歩み"), "modern");
  assert.equal(classifyEra("第二次世界大戦"), "modern");
});

test("classifyEra falls back to 'other' for unrecognized headings", () => {
  assert.equal(classifyEra("地理"), "other");
  assert.equal(classifyEra("文化"), "other");
});

test("parseSections splits lead paragraph and level-2 sections", () => {
  const text = `これはリード文です。

== 古代 ==
古代の記述。

== 中世 ==
中世の記述。
`;
  const { intro, sections } = parseSections(text);
  assert.equal(intro, "これはリード文です。");
  assert.equal(sections.length, 2);
  assert.equal(sections[0].heading, "古代");
  assert.equal(sections[0].era, "prehistoric");
  assert.equal(sections[1].heading, "中世");
  assert.equal(sections[1].era, "medieval");
});

test("parseSections folds level-3 subsections into the preceding level-2 section", () => {
  const text = `リード文。

== 近代 ==
近代の概説。

=== 独立戦争 ===
独立戦争の詳細。
`;
  const { sections } = parseSections(text);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].heading, "近代");
  assert.match(sections[0].text, /近代の概説/);
  assert.match(sections[0].text, /【独立戦争】/);
  assert.match(sections[0].text, /独立戦争の詳細/);
});

test("parseSections drops non-history housekeeping sections", () => {
  const text = `リード文。

== 古代 ==
古代の話。

== 脚注 ==
[1] なにか。

== 関連項目 ==
関連リンク一覧。
`;
  const { sections } = parseSections(text);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].heading, "古代");
});

test("parseSections returns the whole text as intro when there are no headings", () => {
  const { intro, sections } = parseSections("見出しのないただの文章です。");
  assert.equal(intro, "見出しのないただの文章です。");
  assert.deepEqual(sections, []);
});

test("groupIntoEras orders groups prehistoric -> medieval -> modern -> other and drops empty eras", () => {
  const groups = groupIntoEras([
    { era: "modern", heading: "近代", text: "近代の話" },
    { era: "prehistoric", heading: "古代", text: "古代の話" },
    { era: "other", heading: "地理", text: "地理の話" },
  ]);
  assert.deepEqual(
    groups.map((g) => g.era),
    ["prehistoric", "modern", "other"]
  );
  assert.equal(groups.find((g) => g.era === "medieval"), undefined);
});

test("groupIntoEras merges multiple sections of the same era into one group", () => {
  const groups = groupIntoEras([
    { era: "prehistoric", heading: "先史時代", text: "A" },
    { era: "prehistoric", heading: "古代", text: "B" },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].entries.length, 2);
});

test("groupIntoEras truncates very long entries", () => {
  const longText = "あ".repeat(2000);
  const groups = groupIntoEras([{ era: "modern", heading: "現代", text: longText }]);
  assert.ok(groups[0].entries[0].text.length < 2000);
  assert.ok(groups[0].entries[0].text.endsWith("…"));
});
