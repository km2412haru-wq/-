import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { getNews } from "../lib/fetchNews";
import type { FeedSource } from "../lib/types";

const SAMPLE_RSS_A = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Fixture Feed A</title>
    <item>
      <title>OpenAI acquires infra startup to expand data center reach</title>
      <link>https://example.com/a1</link>
      <pubDate>Mon, 24 Aug 2026 09:00:00 GMT</pubDate>
      <description>The all-stock acquisition closed Monday, its largest to date.</description>
    </item>
    <item>
      <title>Startup reports profitable quarter as revenue triples</title>
      <link>https://example.com/a2</link>
      <pubDate>Sun, 23 Aug 2026 09:00:00 GMT</pubDate>
      <description>Net income turned positive for the first time this quarter.</description>
    </item>
  </channel>
</rss>`;

const SAMPLE_RSS_B = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Fixture Feed B</title>
    <item>
      <title>New benchmark result posted for open model</title>
      <link>https://example.com/b1</link>
      <pubDate>Tue, 25 Aug 2026 09:00:00 GMT</pubDate>
      <description>No business news here, just eval numbers.</description>
    </item>
    <item>
      <title>OpenAI acquires infra startup to expand data center reach</title>
      <link>https://example.com/a1</link>
      <pubDate>Mon, 24 Aug 2026 09:00:00 GMT</pubDate>
      <description>Duplicate of feed A's item, same link, to test dedupe.</description>
    </item>
  </channel>
</rss>`;

function startFixtureServer(bodies: Record<string, string>): Promise<{ url: (path: string) => string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const body = bodies[req.url ?? ""];
      if (!body) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "application/rss+xml" });
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        url: (path: string) => `http://127.0.0.1:${port}${path}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

test("getNews fetches multiple feeds in parallel, tags, dedupes, and sorts newest-first", async () => {
  const fixture = await startFixtureServer({
    "/a.xml": SAMPLE_RSS_A,
    "/b.xml": SAMPLE_RSS_B,
  });

  try {
    const feeds: FeedSource[] = [
      { name: "Fixture A", url: fixture.url("/a.xml"), lang: "en" },
      { name: "Fixture B", url: fixture.url("/b.xml"), lang: "en" },
    ];

    const result = await getNews({ feeds, force: true });

    // Dedupe: the item shared by both feeds (same link) should appear once.
    const links = result.items.map((i) => i.link);
    assert.equal(new Set(links).size, links.length, "no duplicate links");
    assert.equal(result.items.length, 3);

    // Sorted newest-first.
    const dates = result.items.map((i) => new Date(i.publishedAt as string).getTime());
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i - 1] >= dates[i], "items must be sorted newest-first");
    }

    // Categorization applied.
    const acquisition = result.items.find((i) => i.link === "https://example.com/a1");
    assert.ok(acquisition);
    assert.ok(acquisition!.categories.includes("ma"));

    const earnings = result.items.find((i) => i.link === "https://example.com/a2");
    assert.ok(earnings!.categories.includes("profit"));

    assert.equal(result.errors.length, 0);
  } finally {
    await fixture.close();
  }
});

test("getNews reports a per-source error without failing the whole batch", async () => {
  const fixture = await startFixtureServer({ "/a.xml": SAMPLE_RSS_A });

  try {
    const feeds: FeedSource[] = [
      { name: "Fixture A", url: fixture.url("/a.xml"), lang: "en" },
      { name: "Missing feed", url: fixture.url("/does-not-exist.xml"), lang: "en" },
    ];

    const result = await getNews({ feeds, force: true });

    assert.equal(result.items.length, 2);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].source, "Missing feed");
  } finally {
    await fixture.close();
  }
});
