import type { PartOfSpeech } from "@/types/word";

/** 品詞の日本語表示ラベル */
export const POS_LABEL: Record<PartOfSpeech, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  other: "その他",
};

/** 品詞ごとの配色(カード枠・バッジ用)。globals.cssのCSS変数を参照する */
export const POS_CLASS: Record<PartOfSpeech, string> = {
  noun: "pos-noun",
  verb: "pos-verb",
  adjective: "pos-adjective",
  adverb: "pos-adverb",
  other: "pos-other",
};

/** 熟語・慣用句用の表示ラベルと配色クラス(品詞とは別枠で管理) */
export const IDIOM_LABEL = "熟語・慣用句";
export const IDIOM_CLASS = "pos-idiom";
