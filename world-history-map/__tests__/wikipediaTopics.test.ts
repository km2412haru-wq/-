import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchTopicSummary } from "../lib/wikipedia";

function startFixtureServer(config: {
  searchResults?: Record<string, string | null>;
  summaries?: Record<string, { title: string; extract: string } | null>;
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

      // page/summary/<title>
      const match = url.pathname.match(/\/api\/rest_v1\/page\/summary\/(.+)$/);
      if (match) {
        const title = decodeURIComponent(match[1]);
        const page = config.summaries?.[title];
        res.writeHead(page ? 200 : 404, { "Content-Type": "application/json" });
        res.end(page ? JSON.stringify(page) : JSON.stringify({ error: "not found" }));
        return;
      }

      res.writeHead(404);
      res.end();
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

test("fetchTopicSummary finds the food-culture article on the first candidate query", async () => {
  const fixture = await startFixtureServer({
    searchResults: { "フランス料理": "フランス料理" },
    summaries: { "フランス料理": { title: "フランス料理", extract: "フランス料理の説明。" } },
  });
  try {
    const summary = await fetchTopicSummary("フランス", "food", { baseUrl: fixture.baseUrl });
    assert.ok(summary);
    assert.equal(summary!.topic, "food");
    assert.equal(summary!.title, "フランス料理");
  } finally {
    await fixture.close();
  }
});

test("fetchTopicSummary falls through to the second candidate query", async () => {
  const fixture = await startFixtureServer({
    searchResults: { "テスト国人": "テスト人" },
    summaries: { "テスト人": { title: "テスト人", extract: "テスト人についての説明。" } },
  });
  try {
    const summary = await fetchTopicSummary("テスト国", "ethnic", { baseUrl: fixture.baseUrl });
    assert.ok(summary);
    assert.equal(summary!.title, "テスト人");
  } finally {
    await fixture.close();
  }
});

test("fetchTopicSummary returns null when no candidate query matches anything", async () => {
  const fixture = await startFixtureServer({ searchResults: {}, summaries: {} });
  try {
    const summary = await fetchTopicSummary("存在しない国", "industry", { baseUrl: fixture.baseUrl });
    assert.equal(summary, null);
  } finally {
    await fixture.close();
  }
});
