import type { FeedSource } from "./types";

/**
 * RSS/Atom sources aggregated by the app.
 *
 * All of these are already AI-focused feeds (a category feed or a
 * dedicated AI publication), so every item that comes back is treated as
 * "AI relevant" by source. If you add a general tech/business feed (e.g.
 * a company's full newsroom, or a broad "Technology" section) that isn't
 * AI-specific, the app will also require an AI-keyword match — see
 * `lib/categorize.ts` -> `isAiRelevant`.
 *
 * Feel free to add/remove sources here. A broken or slow feed only
 * affects itself — see `lib/fetchNews.ts`, each source is fetched
 * independently and failures are reported separately instead of
 * breaking the whole dashboard.
 */
export const FEEDS: FeedSource[] = [
  {
    name: "TechCrunch (AI)",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    lang: "en",
  },
  {
    name: "VentureBeat (AI)",
    url: "https://venturebeat.com/category/ai/feed/",
    lang: "en",
  },
  {
    name: "MIT Technology Review (AI)",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    lang: "en",
  },
  {
    name: "AI News",
    url: "https://www.artificialintelligence-news.com/feed/",
    lang: "en",
  },
  {
    name: "The Verge (AI)",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    lang: "en",
  },
  {
    name: "ITmedia AI+",
    url: "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml",
    lang: "ja",
  },
  {
    name: "PR Newswire (AI)",
    url: "https://www.prnewswire.com/rss/technology-latest-news/artificial-intelligence-latest-news-list.rss",
    lang: "en",
  },
  {
    name: "Ledge.ai",
    url: "https://ledge.ai/feed/",
    lang: "ja",
  },
  {
    name: "AINOW",
    url: "https://ainow.ai/feed/",
    lang: "ja",
  },
  {
    name: "AI-SCHOLAR",
    url: "https://ai-scholar.tech/feed/",
    lang: "ja",
  },
];
