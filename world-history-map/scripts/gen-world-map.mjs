// Generates public/world-map.json: a flat list of country shapes (as SVG
// path `d` strings) plus ISO codes and Japanese/English names, built from
// world-atlas's TopoJSON (Natural Earth data, public domain) at build
// time. No external network call, no API key — the map itself never talks
// to a geo/maps service at runtime.
import { readFileSync, writeFileSync } from "node:fs";
import { geoPath, geoNaturalEarth1 } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
import ja from "i18n-iso-countries/langs/ja.json" with { type: "json" };
import en from "i18n-iso-countries/langs/en.json" with { type: "json" };

countries.registerLocale(ja);
countries.registerLocale(en);

const WIDTH = 960;
const HEIGHT = 500;

// A handful of TopoJSON numeric ids that don't cleanly map through ISO
// 3166-1 numeric -> alpha-2 (disputed territories, historical entries in
// the Natural Earth dataset, Antarctica, etc). Filled in by hand so the
// map doesn't just silently drop these shapes; the Japanese name is what
// we'll use to look up a Wikipedia article. `alpha2: null` marks it as
// "not a real ISO country" for the history lookup (see app/api/history).
const ID_OVERRIDES = {
  "010": { nameJa: "南極大陸", nameEn: "Antarctica", alpha2: null },
};

// Same idea, but these Natural Earth features carry no `id` at all (not
// even "-99"), so they're matched by their English `properties.name`
// instead.
const NAME_OVERRIDES = {
  Kosovo: { alpha2: "XK" },
  "N. Cyprus": { nameJa: "北キプロス", nameEn: "Northern Cyprus", alpha2: null },
  Somaliland: { nameJa: "ソマリランド", nameEn: "Somaliland", alpha2: null },
  "Siachen Glacier": { nameJa: "シアチェン氷河（係争地）", nameEn: "Siachen Glacier", alpha2: null },
  "Indian Ocean Ter.": { alpha2: "IO" },
};

function loadTopology() {
  const raw = readFileSync(
    new URL("../node_modules/world-atlas/countries-50m.json", import.meta.url)
  );
  return JSON.parse(raw);
}

function main() {
  const topology = loadTopology();
  const geo = feature(topology, topology.objects.countries);

  const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], geo);
  const path = geoPath(projection);

  // Natural Earth sometimes gives two distinct shapes the same ISO numeric
  // id (e.g. Australia and its Ashmore & Cartier Islands territory both
  // carry "036") — dedupe here so every shape gets a unique `id` (used as
  // the React key when rendering <path> elements).
  const usedIds = new Set();
  function uniqueId(candidate) {
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
    let n = 2;
    while (usedIds.has(`${candidate}-${n}`)) n++;
    const deduped = `${candidate}-${n}`;
    usedIds.add(deduped);
    return deduped;
  }

  const shapes = geo.features
    .map((f) => {
      const hasNumericId = f.id !== undefined && f.id !== null;
      // The "raw" id drives ISO/name lookups; `id` (below) is only for
      // uniqueness as a React key and must never feed back into lookups —
      // deduping can suffix it (e.g. "036-2"), which isn't a valid ISO code.
      const rawId = hasNumericId
        ? String(f.id).padStart(3, "0")
        : `x-${f.properties.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const id = uniqueId(rawId);

      const override = hasNumericId
        ? (ID_OVERRIDES[String(f.id)] ?? ID_OVERRIDES[rawId] ?? NAME_OVERRIDES[f.properties.name])
        : NAME_OVERRIDES[f.properties.name];
      const alpha2 =
        override?.alpha2 !== undefined
          ? override.alpha2
          : hasNumericId
            ? (countries.numericToAlpha2(rawId) ?? null)
            : null;

      const nameJa =
        override?.nameJa ?? (alpha2 ? countries.getName(alpha2, "ja") : null) ?? f.properties.name;
      const nameEn =
        override?.nameEn ?? (alpha2 ? countries.getName(alpha2, "en") : null) ?? f.properties.name;

      const d = path(f);
      if (!d) return null;

      return { id, alpha2, nameJa, nameEn, d };
    })
    .filter(Boolean)
    // Stable order: doesn't affect rendering (each is an absolutely
    // positioned path) but makes diffs of the generated file readable.
    .sort((a, b) => a.nameJa.localeCompare(b.nameJa, "ja"));

  const out = { width: WIDTH, height: HEIGHT, shapes };
  writeFileSync(
    new URL("../public/world-map.json", import.meta.url),
    JSON.stringify(out)
  );
  console.log(`wrote public/world-map.json — ${shapes.length} shapes`);
}

main();
