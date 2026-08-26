/**
 * Fetches a country-history summary from Japanese Wikipedia. No API key —
 * Wikipedia's REST API and MediaWiki search API are free for this kind of
 * light, non-commercial use as long as a descriptive User-Agent is sent.
 *
 * Strategy:
 *  1. Search for "{name}の歴史" (a dedicated "History of X" article).
 *     Article title conventions vary a lot across countries, so we search
 *     instead of guessing the exact title.
 *  2. If found, fetch its summary extract.
 *  3. Otherwise, fall back to the country's own Wikipedia page (its intro
 *     usually still covers historical background).
 */

export interface CountryHistory {
  title: string;
  extract: string;
  thumbnail: { url: string; width: number; height: number } | null;
  pageUrl: string;
  /** False when we fell back to the country's general article. */
  isHistorySpecific: boolean;
}

const HEADERS = {
  "User-Agent": "AI-MA-Radar-WorldHistoryMap/1.0 (educational hobby project; no contact set)",
  Accept: "application/json",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — history doesn't change often
const cache = new Map<string, { value: CountryHistory | null; expiresAt: number }>();

const DEFAULT_BASE_URL = "https://ja.wikipedia.org";

async function searchTitle(baseUrl: string, query: string): Promise<string | null> {
  const url = `${baseUrl}/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.query?.search?.[0]?.title ?? null;
}

async function fetchSummary(
  baseUrl: string,
  title: string
): Promise<{
  title: string;
  extract: string;
  thumbnail: { source: string; width: number; height: number } | null;
  content_urls?: { desktop?: { page?: string } };
  type?: string;
} | null> {
  const url = `${baseUrl}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === "disambiguation" || !data.extract) return null;
  return data;
}

function toResult(
  summary: NonNullable<Awaited<ReturnType<typeof fetchSummary>>>,
  isHistorySpecific: boolean
): CountryHistory {
  return {
    title: summary.title,
    extract: summary.extract,
    thumbnail: summary.thumbnail
      ? { url: summary.thumbnail.source, width: summary.thumbnail.width, height: summary.thumbnail.height }
      : null,
    pageUrl:
      summary.content_urls?.desktop?.page ??
      `https://ja.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`,
    isHistorySpecific,
  };
}

export async function fetchCountryHistory(
  nameJa: string,
  options?: { baseUrl?: string }
): Promise<CountryHistory | null> {
  // A custom baseUrl means a test is pointing this at a local fixture
  // server — skip the shared cache so tests stay isolated from real usage.
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const useCache = !options?.baseUrl;

  if (useCache) {
    const cached = cache.get(nameJa);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  let result: CountryHistory | null = null;
  try {
    const historyTitle = await searchTitle(baseUrl, `${nameJa}の歴史`);
    if (historyTitle) {
      const summary = await fetchSummary(baseUrl, historyTitle);
      if (summary) result = toResult(summary, true);
    }
    if (!result) {
      const summary = await fetchSummary(baseUrl, nameJa);
      if (summary) result = toResult(summary, false);
    }
  } catch {
    result = null;
  }

  if (useCache) {
    cache.set(nameJa, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return result;
}
