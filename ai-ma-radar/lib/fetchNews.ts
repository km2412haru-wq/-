import Parser from "rss-parser";
import { FEEDS } from "./feeds";
import { categorize } from "./categorize";
import { detectOrigin } from "./companyOrigin";
import type { FeedSource, FetchResult, NewsItem } from "./types";

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; AI-MA-Radar/1.0; +https://github.com/)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache: { result: FetchResult; expiresAt: number } | null = null;

function makeId(link: string | undefined, title: string | undefined): string {
  const base = link || title || Math.random().toString(36);
  // Cheap, dependency-free hash — good enough for a stable React key / dedupe key.
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

async function fetchOneFeed(
  source: FeedSource
): Promise<{ items: NewsItem[] } | { error: string }> {
  try {
    const feed = await parser.parseURL(source.url);
    const items: NewsItem[] = (feed.items || []).map((entry) => {
      const title = entry.title?.trim() || "(no title)";
      const summary = stripHtml(
        entry.contentSnippet || entry.summary || entry.content || ""
      ).slice(0, 400);
      const link = entry.link?.trim() || "";
      const publishedAt = entry.isoDate || entry.pubDate || null;

      return {
        id: makeId(link, title),
        title,
        link,
        publishedAt,
        summary,
        source: source.name,
        lang: source.lang,
        categories: categorize(title, summary),
        origin: detectOrigin(title, summary),
        weakMatch: false,
      };
    });
    return { items };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetches every configured feed in parallel, tags each item with a
 * category, dedupes by link, and sorts newest-first. Results are cached
 * in-memory for CACHE_TTL_MS so the dashboard doesn't hammer every source
 * on every page load. Pass `force: true` to bypass the cache.
 */
export async function getNews(options?: {
  force?: boolean;
  /** Override the configured feed list — used by tests to avoid real network calls. */
  feeds?: FeedSource[];
}): Promise<FetchResult> {
  const feeds = options?.feeds ?? FEEDS;
  const useCache = !options?.feeds; // custom feed lists (tests) bypass the shared cache

  const now = Date.now();
  if (useCache && !options?.force && cache && cache.expiresAt > now) {
    return cache.result;
  }

  const settled = await Promise.allSettled(feeds.map(fetchOneFeed));

  const items: NewsItem[] = [];
  const errors: FetchResult["errors"] = [];

  settled.forEach((outcome, i) => {
    const source = feeds[i];
    if (outcome.status === "fulfilled") {
      if ("error" in outcome.value) {
        errors.push({ source: source.name, message: outcome.value.error });
      } else {
        items.push(...outcome.value.items);
      }
    } else {
      errors.push({
        source: source.name,
        message: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      });
    }
  });

  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    const key = item.link || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  const result: FetchResult = {
    items: deduped,
    errors,
    fetchedAt: new Date().toISOString(),
  };

  if (useCache) {
    cache = { result, expiresAt: now + CACHE_TTL_MS };
  }
  return result;
}
