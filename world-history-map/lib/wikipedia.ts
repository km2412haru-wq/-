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

/* ---------------------------------------------------------------------
 * Era-grouped detail view: 原始・古代 → 中世 → 近代・現代
 *
 * Wikipedia doesn't expose a structured "timeline" API, so this fetches
 * the full plain-text extract of the article (which includes `== Heading
 * ==` section markers) and buckets each top-level section into an era by
 * matching keywords in its heading. Coverage is inherently approximate —
 * period names and article structure vary a lot country to country — so
 * anything that doesn't match a known era keyword lands in a catch-all
 * "その他の時代" bucket rather than being dropped.
 * ------------------------------------------------------------------- */

export type Era = "prehistoric" | "medieval" | "modern" | "other";

export const ERA_ORDER: Era[] = ["prehistoric", "medieval", "modern", "other"];

export const ERA_LABELS: Record<Era, string> = {
  prehistoric: "🏺 原始・古代",
  medieval: "🏰 中世",
  modern: "🏙️ 近代・現代",
  other: "📜 その他の時代",
};

const ERA_KEYWORDS: Record<Exclude<Era, "other">, RegExp> = {
  prehistoric: /先史|原始|旧石器|新石器|石器時代|青銅器|太古|有史以前|古代|文明の起源|建国/,
  medieval: /中世/,
  modern: /近代|近世|現代|植民地|独立(?!.*(?:記念|運動).*(?:以前|前))|冷戦|戦後|世界大戦|21世紀|20世紀/,
};

/** Section headings that aren't history content — always dropped. */
const NON_HISTORY_HEADING = /^(脚注|注釈|参照|出典|参考文献|関連項目|外部リンク|関連書籍|関連作品)$/;

const MAX_ENTRY_LENGTH = 1200;

export function classifyEra(heading: string): Era {
  if (ERA_KEYWORDS.prehistoric.test(heading)) return "prehistoric";
  if (ERA_KEYWORDS.medieval.test(heading)) return "medieval";
  if (ERA_KEYWORDS.modern.test(heading)) return "modern";
  return "other";
}

export interface ParsedSection {
  era: Era;
  heading: string;
  text: string;
}

/**
 * Splits a MediaWiki plain-text extract (as returned by
 * `prop=extracts&explaintext=true&exsectionformat=wiki`) into a lead
 * paragraph plus a flat list of level-2 sections. Level 3+ subsections are
 * folded into their nearest preceding level-2 section instead of becoming
 * their own entries, so the result stays a manageable, flat list.
 */
export function parseSections(fullText: string): { intro: string; sections: ParsedSection[] } {
  const headingRegex = /^(={2,4})\s*(.+?)\s*\1\s*$/gm;
  const matches = [...fullText.matchAll(headingRegex)];

  if (matches.length === 0) {
    return { intro: fullText.trim(), sections: [] };
  }

  const intro = fullText.slice(0, matches[0].index).trim();
  const sections: ParsedSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const level = m[1].length;
    const heading = m[2].trim();
    if (NON_HISTORY_HEADING.test(heading)) continue;

    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : fullText.length;
    const text = fullText.slice(start, end).trim();
    if (!text) continue;

    if (level === 2 || sections.length === 0) {
      sections.push({ era: classifyEra(heading), heading, text });
    } else {
      // Subsection: fold into the previous level-2 section under its own
      // sub-heading rather than creating a new top-level entry.
      const last = sections[sections.length - 1];
      last.text += `\n\n【${heading}】\n${text}`;
    }
  }

  return { intro, sections };
}

export interface EraGroup {
  era: Era;
  label: string;
  entries: { heading: string; text: string }[];
}

/** Groups parsed sections by era, in a fixed display order, dropping empty eras. */
export function groupIntoEras(sections: ParsedSection[]): EraGroup[] {
  const byEra = new Map<Era, { heading: string; text: string }[]>();
  for (const section of sections) {
    const text =
      section.text.length > MAX_ENTRY_LENGTH
        ? section.text.slice(0, MAX_ENTRY_LENGTH).trim() + "…"
        : section.text;
    const list = byEra.get(section.era) ?? [];
    list.push({ heading: section.heading, text });
    byEra.set(section.era, list);
  }

  return ERA_ORDER.filter((era) => byEra.has(era)).map((era) => ({
    era,
    label: ERA_LABELS[era],
    entries: byEra.get(era)!,
  }));
}

export interface CountryHistoryDetail {
  title: string;
  pageUrl: string;
  isHistorySpecific: boolean;
  intro: string;
  eras: EraGroup[];
}

async function fetchFullExtract(
  baseUrl: string,
  title: string
): Promise<{ title: string; extract: string; pageUrl: string } | null> {
  const url = `${baseUrl}/w/api.php?action=query&prop=extracts&explaintext=true&exsectionformat=wiki&format=json&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as { title?: string; extract?: string; missing?: string } | undefined;
  if (!page || page.missing !== undefined || !page.extract) return null;
  return {
    title: page.title ?? title,
    extract: page.extract,
    pageUrl: `${baseUrl}/wiki/${encodeURIComponent(page.title ?? title)}`,
  };
}

const detailCache = new Map<string, { value: CountryHistoryDetail | null; expiresAt: number }>();

export async function fetchCountryHistoryDetail(
  nameJa: string,
  options?: { baseUrl?: string }
): Promise<CountryHistoryDetail | null> {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const useCache = !options?.baseUrl;

  if (useCache) {
    const cached = detailCache.get(nameJa);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  let result: CountryHistoryDetail | null = null;
  try {
    const historyTitle = await searchTitle(baseUrl, `${nameJa}の歴史`);
    let page = historyTitle ? await fetchFullExtract(baseUrl, historyTitle) : null;
    let isHistorySpecific = true;
    if (!page) {
      page = await fetchFullExtract(baseUrl, nameJa);
      isHistorySpecific = false;
    }

    if (page) {
      const { intro, sections } = parseSections(page.extract);
      result = {
        title: page.title,
        pageUrl: page.pageUrl,
        isHistorySpecific,
        intro,
        eras: groupIntoEras(sections),
      };
    }
  } catch {
    result = null;
  }

  if (useCache) {
    detailCache.set(nameJa, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return result;
}
