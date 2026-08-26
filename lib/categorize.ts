import type { Category } from "./types";

/**
 * Keyword-based tagging. This is intentionally simple (no external NLP/LLM
 * call, no API key required) so the app works out of the box. Swap this
 * module out for a real classifier later if you want higher precision.
 */

interface KeywordSet {
  category: Category;
  /** Matched with \b word boundaries, case-insensitive. */
  en: string[];
  /** Matched as plain substrings (CJK text has no word boundaries). */
  ja: string[];
}

const KEYWORDS: KeywordSet[] = [
  {
    category: "ma",
    en: [
      "acquisition",
      "acquires",
      "acquired",
      "acquire",
      "merger",
      "merges",
      "buyout",
      "takeover",
      "to buy",
      "M&A",
      "stake in",
      "majority stake",
    ],
    ja: ["買収", "合併", "統合", "経営統合", "子会社化", "出資", "TOB", "M&A"],
  },
  {
    category: "business",
    en: [
      "business model",
      "pricing model",
      "subscription",
      "go-to-market",
      "monetization",
      "monetize",
      "strategy",
      "partnership",
      "enterprise deal",
      "licensing",
      "rebrand",
      "pivot",
    ],
    ja: [
      "ビジネスモデル",
      "収益モデル",
      "料金プラン",
      "サブスクリプション",
      "事業戦略",
      "業務提携",
      "提携",
      "戦略",
      "新規事業",
    ],
  },
  {
    category: "profit",
    en: [
      "profit",
      "profitable",
      "profitability",
      "earnings",
      "revenue",
      "quarterly results",
      "net income",
      "valuation",
      "funding round",
      "raises",
      "series a",
      "series b",
      "series c",
      "series d",
      "ipo",
      "loss",
      "operating margin",
    ],
    ja: [
      "利益",
      "増益",
      "減益",
      "黒字",
      "赤字",
      "業績",
      "決算",
      "売上",
      "増収",
      "減収",
      "資金調達",
      "評価額",
      "上場",
      "営業利益",
      "純利益",
    ],
  },
];

function matchesEnglish(text: string, terms: string[]): boolean {
  return terms.some((term) => {
    // Multi-word phrases: plain (escaped) substring match.
    // Single words: word-boundary match to avoid matching inside unrelated words.
    if (term.includes(" ")) {
      return text.includes(term.toLowerCase());
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });
}

function matchesJapanese(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

/**
 * Returns every category whose keywords appear in the given text.
 * Falls back to `["other"]` when nothing matches.
 */
export function categorize(title: string, summary: string): Category[] {
  const text = `${title}\n${summary}`;
  const lower = text.toLowerCase();

  const matched = KEYWORDS.filter(
    (set) => matchesEnglish(lower, set.en) || matchesJapanese(text, set.ja)
  ).map((set) => set.category);

  return matched.length > 0 ? matched : ["other"];
}

// A light AI-relevance check, for use if a general (non-AI-specific) feed
// is ever added to lib/feeds.ts. Not applied to sources that are already
// AI-focused (see the comment in lib/feeds.ts).
const AI_TERMS_EN = [
  "artificial intelligence",
  "\\bAI\\b",
  "machine learning",
  "\\bLLM\\b",
  "generative AI",
  "OpenAI",
  "Anthropic",
  "DeepMind",
  "neural network",
  "chatbot",
  "foundation model",
];
const AI_TERMS_JA = ["人工知能", "生成AI", "機械学習", "AI"];

export function isAiRelevant(title: string, summary: string): boolean {
  const text = `${title}\n${summary}`;
  const enHit = AI_TERMS_EN.some((pattern) => new RegExp(pattern, "i").test(text));
  const jaHit = AI_TERMS_JA.some((term) => text.includes(term));
  return enHit || jaHit;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  ma: "M&A",
  business: "ビジネスモデル",
  profit: "利益・業績",
  other: "その他",
};
