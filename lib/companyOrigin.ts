/**
 * Keyword-based "which companies does this article mention" classifier —
 * same approach as lib/categorize.ts (no external API/LLM call). An
 * article can be tagged with both "jp" and "overseas" (e.g. a Japan/US
 * partnership or investment story) or neither (unknown company mix).
 */

export type Origin = "jp" | "overseas";

interface CompanyList {
  origin: Origin;
  /** Matched with \b word boundaries, case-insensitive. */
  en: string[];
  /** Matched as plain substrings (CJK text has no word boundaries). */
  ja: string[];
}

const COMPANIES: CompanyList[] = [
  {
    origin: "jp",
    en: [
      "SoftBank",
      "NTT",
      "Sony",
      "NEC",
      "Fujitsu",
      "Hitachi",
      "Panasonic",
      "Rakuten",
      "Preferred Networks",
      "Sakana AI",
      "ABEJA",
      "PKSHA",
      "ELYZA",
      "CyberAgent",
      "Recruit",
      "Denso",
      "Toyota",
      "Honda",
      "Mitsubishi Electric",
      "KDDI",
      "Toshiba",
      "Omron",
      "Cyberdyne",
      "ExaWizards",
      "Rinna",
      "LayerX",
      "Mercari",
      "Money Forward",
      "LY Corporation",
      "Turing Inc",
    ],
    ja: [
      "ソフトバンク",
      "ソニー",
      "日本電気",
      "富士通",
      "日立",
      "パナソニック",
      "楽天",
      "さかなAI",
      "サイバーエージェント",
      "リクルート",
      "デンソー",
      "トヨタ",
      "ホンダ",
      "三菱電機",
      "東芝",
      "オムロン",
      "エクサウィザーズ",
      "メルカリ",
      "マネーフォワード",
      "LINEヤフー",
      "野村総合研究所",
      "NTTデータ",
    ],
  },
  {
    origin: "overseas",
    en: [
      "OpenAI",
      "Google",
      "Alphabet",
      "DeepMind",
      "Microsoft",
      "Meta",
      "Amazon",
      "Anthropic",
      "Nvidia",
      "Apple",
      "IBM",
      "Salesforce",
      "xAI",
      "Mistral",
      "Baidu",
      "Alibaba",
      "Tencent",
      "Samsung",
      "Cohere",
      "Stability AI",
      "Midjourney",
      "Palantir",
      "Databricks",
      "Scale AI",
      "Hugging Face",
      "Perplexity",
      "Character.AI",
      "Snowflake",
      "Oracle",
      "Intel",
      "AMD",
      "Qualcomm",
      "Tesla",
      "SAP",
      "ByteDance",
    ],
    ja: [
      "オープンAI",
      "グーグル",
      "マイクロソフト",
      "アマゾン",
      "アンソロピック",
      "エヌビディア",
      "アップル",
      "サムスン",
      "バイドゥ",
      "アリババ",
      "テンセント",
    ],
  },
];

function matchesEnglish(lowerText: string, terms: string[]): boolean {
  return terms.some((term) => {
    if (term.includes(" ") || term.includes(".")) {
      return lowerText.includes(term.toLowerCase());
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(lowerText);
  });
}

function matchesJapanese(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

/** Returns every origin whose company keywords appear in the given text. */
export function detectOrigin(title: string, summary: string): Origin[] {
  const text = `${title}\n${summary}`;
  const lower = text.toLowerCase();

  return COMPANIES.filter(
    (list) => matchesEnglish(lower, list.en) || matchesJapanese(text, list.ja)
  ).map((list) => list.origin);
}

export const ORIGIN_LABELS: Record<Origin, string> = {
  jp: "🇯🇵 国内",
  overseas: "🌐 海外",
};
