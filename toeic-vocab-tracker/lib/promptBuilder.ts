import { POS_LABEL } from "@/lib/partOfSpeech";
import type { PartOfSpeech } from "@/types/word";

export function buildSystemInstruction(): string {
  return [
    "あなたは英語学習者(日本人のTOEIC受験者)を支援する語彙コーチです。",
    "登録された英単語について、意味的に関連する派生語(同じ語根を持つ、品詞違いの単語)を提案します。",
    "派生語とは、名詞形・動詞形・形容詞形・副詞形など、語尾変化によって品詞が変わる単語のことです。",
    "単純な複数形・過去形・進行形などの活用形は派生語に含めないでください。",
    "実在し、TOEICや一般的なビジネス英語で使われる頻度がある単語のみを提案してください。造語は提案しないでください。",
    "日本語の意味は、TOEIC学習者にとって分かりやすく簡潔な訳語にしてください。",
  ].join("\n");
}

export function buildDerivativesPrompt(params: {
  word: string;
  meaning: string;
  partOfSpeech: PartOfSpeech;
  existingWords: string[];
}): string {
  const { word, meaning, partOfSpeech, existingWords } = params;

  const lines = [
    `単語: ${word}`,
    `品詞: ${POS_LABEL[partOfSpeech]}`,
    `意味(参考): ${meaning}`,
    "",
    `この単語について、存在する派生語(名詞・動詞・形容詞・副詞のうち、"${word}"自身と異なる品詞のもの)をすべて提案してください。`,
  ];

  if (existingWords.length > 0) {
    lines.push(
      "",
      "以下の単語はすでに登録済みのため、重複して提案しないでください:",
      existingWords.join(", ")
    );
  }

  lines.push(
    "",
    "該当する派生語が存在しない場合は、空のリストを返してください。"
  );

  return lines.join("\n");
}
