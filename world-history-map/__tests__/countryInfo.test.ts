import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchCountryBasicInfo, formatPopulationJa } from "../lib/countryInfo";

test("formatPopulationJa formats hundreds of millions as 億/万", () => {
  assert.equal(formatPopulationJa(125_000_000), "約1億2,500万人");
});

test("formatPopulationJa formats an exact multiple of 億 without a 万 remainder", () => {
  assert.equal(formatPopulationJa(300_000_000), "約3億人");
});

test("formatPopulationJa formats tens of thousands as 万", () => {
  assert.equal(formatPopulationJa(5_400_000), "約540万人");
});

test("formatPopulationJa formats small counts plainly", () => {
  assert.equal(formatPopulationJa(800), "800人");
});

test("formatPopulationJa handles missing/invalid input", () => {
  assert.equal(formatPopulationJa(0), "不明");
  assert.equal(formatPopulationJa(NaN), "不明");
});

function startFixtureServer(routes: Record<string, unknown>): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const match = routes[url.pathname];
      if (match === undefined) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(match));
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

test("fetchCountryBasicInfo parses a bare-object response and derives a flag URL", async () => {
  const fixture = await startFixtureServer({
    "/alpha/JP": { capital: ["Tokyo"], population: 125000000 },
  });
  try {
    const info = await fetchCountryBasicInfo("JP", { baseUrl: fixture.baseUrl });
    assert.ok(info);
    assert.deepEqual(info!.capital, ["Tokyo"]);
    assert.equal(info!.population, 125000000);
    assert.equal(info!.flagUrl, "https://flagcdn.com/jp.svg");
  } finally {
    await fixture.close();
  }
});

test("fetchCountryBasicInfo also handles an array-wrapped response", async () => {
  const fixture = await startFixtureServer({
    "/alpha/FR": [{ capital: ["Paris"], population: 68000000 }],
  });
  try {
    const info = await fetchCountryBasicInfo("FR", { baseUrl: fixture.baseUrl });
    assert.ok(info);
    assert.deepEqual(info!.capital, ["Paris"]);
  } finally {
    await fixture.close();
  }
});

test("fetchCountryBasicInfo returns null when the code isn't found", async () => {
  const fixture = await startFixtureServer({});
  try {
    const info = await fetchCountryBasicInfo("ZZ", { baseUrl: fixture.baseUrl });
    assert.equal(info, null);
  } finally {
    await fixture.close();
  }
});
