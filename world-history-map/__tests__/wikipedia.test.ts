import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchCountryHistory } from "../lib/wikipedia";

function startFixtureServer(routes: Record<string, unknown>): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const body = routes[url.pathname + "?" + [...url.searchParams.keys()].sort().join("&")];
      const bodyByPath = routes[url.pathname];
      const match = body ?? bodyByPath;
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

test("finds a dedicated history article via search and returns its summary", async () => {
  const fixture = await startFixtureServer({
    "/w/api.php": { query: { search: [{ title: "日本の歴史" }] } },
    "/api/rest_v1/page/summary/%E6%97%A5%E6%9C%AC%E3%81%AE%E6%AD%B4%E5%8F%B2": {
      title: "日本の歴史",
      extract: "日本の歴史についての要約テキスト。",
      thumbnail: { source: "https://example.com/thumb.jpg", width: 200, height: 100 },
      content_urls: { desktop: { page: "https://ja.wikipedia.org/wiki/日本の歴史" } },
    },
  });

  try {
    const result = await fetchCountryHistory("日本", { baseUrl: fixture.baseUrl });
    assert.ok(result);
    assert.equal(result!.title, "日本の歴史");
    assert.equal(result!.isHistorySpecific, true);
    assert.equal(result!.extract, "日本の歴史についての要約テキスト。");
    assert.equal(result!.thumbnail?.url, "https://example.com/thumb.jpg");
  } finally {
    await fixture.close();
  }
});

test("falls back to the country's plain article when no history-specific page is found", async () => {
  const fixture = await startFixtureServer({
    "/w/api.php": { query: { search: [] } },
    "/api/rest_v1/page/summary/%E3%83%86%E3%82%B9%E3%83%88%E5%9B%BD": {
      title: "テスト国",
      extract: "テスト国についての概要。",
      thumbnail: null,
    },
  });

  try {
    const result = await fetchCountryHistory("テスト国", { baseUrl: fixture.baseUrl });
    assert.ok(result);
    assert.equal(result!.isHistorySpecific, false);
    assert.equal(result!.extract, "テスト国についての概要。");
  } finally {
    await fixture.close();
  }
});

test("returns null when neither the history article nor the plain article exist", async () => {
  const fixture = await startFixtureServer({
    "/w/api.php": { query: { search: [] } },
    // No summary route registered at all -> every summary fetch 404s.
  });

  try {
    const result = await fetchCountryHistory("存在しない国", { baseUrl: fixture.baseUrl });
    assert.equal(result, null);
  } finally {
    await fixture.close();
  }
});

test("treats a disambiguation-page summary as not found and falls back", async () => {
  const fixture = await startFixtureServer({
    "/w/api.php": { query: { search: [{ title: "曖昧さ回避ページ" }] } },
    "/api/rest_v1/page/summary/%E6%9B%96%E6%98%A7%E3%81%95%E5%9B%9E%E9%81%BF%E3%83%9A%E3%83%BC%E3%82%B8": {
      type: "disambiguation",
      title: "曖昧さ回避ページ",
    },
    "/api/rest_v1/page/summary/%E6%9B%96%E6%98%A7%E5%9B%BD": {
      title: "曖昧国",
      extract: "フォールバックの概要。",
    },
  });

  try {
    const result = await fetchCountryHistory("曖昧国", { baseUrl: fixture.baseUrl });
    assert.ok(result);
    assert.equal(result!.isHistorySpecific, false);
    assert.equal(result!.extract, "フォールバックの概要。");
  } finally {
    await fixture.close();
  }
});
