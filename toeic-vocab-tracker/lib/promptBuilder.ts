import { POS_LABEL } from "@/lib/partOfSpeech";
import type { EntryType, PartOfSpeech } from "@/types/word";

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

export function buildExampleSystemInstruction(): string {
  return [
    "あなたは英語学習者(日本人のTOEIC受験者)を支援する語彙コーチです。",
    "登録された単語・熟語について、TOEIC L&Rで出題されるようなビジネスシーン(オフィス・会議・メール・出張・契約など)を想定した、自然で簡潔な英語の例文を1つ作成します。",
    "例文は1文のみとし、長すぎず(15〜25語程度)、TOEIC学習者が読んで理解しやすい難易度にしてください。",
    "例文には指定された単語・熟語を、指定された意味・品詞に合う形で自然に使ってください(活用形に変化させてよい)。",
    "日本語訳は、例文全体の自然な訳にしてください。単語の意味の説明ではなく、文全体の翻訳です。",
  ].join("\n");
}

export function buildExamplePrompt(params: {
  entryType: EntryType;
  text: string;
  meaning: string;
  partOfSpeech: PartOfSpeech;
}): string {
  const { entryType, text, meaning, partOfSpeech } = params;

  if (entryType === "idiom") {
    return [
      `熟語・慣用句: ${text}`,
      `意味(参考): ${meaning}`,
      "",
      `この熟語・慣用句を自然に使った、TOEICのビジネスシーンを想定した英語の例文を1つ作成し、日本語訳もつけてください。`,
    ].join("\n");
  }

  return [
    `単語: ${text}`,
    `品詞: ${POS_LABEL[partOfSpeech]}`,
    `意味(参考): ${meaning}`,
    "",
    `この単語を自然に使った、TOEICのビジネスシーンを想定した英語の例文を1つ作成し、日本語訳もつけてください。`,
  ].join("\n");
}
