import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchCountryHistoryDetail } from "../lib/wikipedia";

/**
 * A fixture server that understands the two MediaWiki call shapes this
 * module makes: a search query (`list=search`) and a full-extract query
 * (`prop=extracts`). Routes are matched on the meaningful query params
 * rather than the raw path, since both calls share the same `/w/api.php`
 * endpoint.
 */
function startFixtureServer(config: {
  searchResults?: Record<string, string | null>; // srsearch -> matched title (or null for no match)
  extracts?: Record<string, { title: string; extract: string } | null>; // titles -> page (or null for missing)
}): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const params = url.searchParams;

      if (params.get("list") === "search") {
        const query = params.get("srsearch") ?? "";
        const title = config.searchResults?.[query];
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ query: { search: title ? [{ title }] : [] } }));
        return;
      }

      if (params.get("prop") === "extracts") {
        const titles = params.get("titles") ?? "";
        const page = config.extracts?.[titles];
        res.writeHead(200, { "Content-Type": "application/json" });
        if (page === undefined) {
          res.end(JSON.stringify({ query: { pages: {} } }));
        } else if (page === null) {
          res.end(JSON.stringify({ query: { pages: { "-1": { title: titles, missing: "" } } } }));
        } else {
          res.end(JSON.stringify({ query: { pages: { "1": { title: page.title, extract: page.extract } } } }));
        }
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unhandled" }));
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

test("fetchCountryHistoryDetail groups a dedicated history article's sections by era", async () => {
  const fixture = await startFixtureServer({
    searchResults: { "日本の歴史": "日本の歴史" },
    extracts: {
      日本の歴史: {
        title: "日本の歴史",
        extract: `日本の歴史の概説。

== 古代 ==
古代の記述。

== 中世 ==
中世の記述。

== 近代 ==
近代の記述。
`,
      },
    },
  });

  try {
    const detail = await fetchCountryHistoryDetail("日本", { baseUrl: fixture.baseUrl });
    assert.ok(detail);
    assert.equal(detail!.isHistorySpecific, true);
    assert.equal(detail!.intro, "日本の歴史の概説。");
    assert.deepEqual(
      detail!.eras.map((e) => e.era),
      ["prehistoric", "medieval", "modern"]
    );
  } finally {
    await fixture.close();
  }
});

test("fetchCountryHistoryDetail falls back to the plain article when no history-specific page is found", async () => {
  const fixture = await startFixtureServer({
    searchResults: {},
    extracts: {
      テスト国: {
        title: "テスト国",
        extract: `テスト国の概要。

== 現代 ==
現代の記述。
`,
      },
    },
  });

  try {
    const detail = await fetchCountryHistoryDetail("テスト国", { baseUrl: fixture.baseUrl });
    assert.ok(detail);
    assert.equal(detail!.isHistorySpecific, false);
    assert.equal(detail!.eras[0].era, "modern");
  } finally {
    await fixture.close();
  }
});

test("fetchCountryHistoryDetail returns null when nothing is found at all", async () => {
  const fixture = await startFixtureServer({ searchResults: {}, extracts: {} });

  try {
    const detail = await fetchCountryHistoryDetail("存在しない国", { baseUrl: fixture.baseUrl });
    assert.equal(detail, null);
  } finally {
    await fixture.close();
  }
});
