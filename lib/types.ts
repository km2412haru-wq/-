export type Category = "ma" | "business" | "profit" | "other";

export interface FeedSource {
  /** Display name shown as a badge on each card. */
  name: string;
  /** RSS/Atom feed URL. */
  url: string;
  /** Primary language of this source, used for minor UI hints. */
  lang: "ja" | "en";
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  /** ISO date string, when available from the feed. */
  publishedAt: string | null;
  summary: string;
  source: string;
  categories: Category[];
  /** True if the item didn't clearly match any AI-company keyword and is kept only because its feed is AI-focused. */
  weakMatch: boolean;
}

export interface FetchResult {
  items: NewsItem[];
  errors: { source: string; message: string }[];
  fetchedAt: string;
}
