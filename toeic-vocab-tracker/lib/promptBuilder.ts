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

export function buildPhoneticSystemInstruction(): string {
  return [
    "あなたは英語学習者(日本人のTOEIC受験者)を支援する語彙コーチです。",
    "入力された英単語・熟語について、国際音声記号(IPA)による発音表記を1つ答えます。",
    "アメリカ英語の発音を基準とし、第一強勢(アクセント)の位置にˈを付けてください。",
    "表記は / /(スラッシュ)で囲んでください(例: /sɪɡˈnɪfɪkənt/)。",
    "熟語・慣用句の場合は、フレーズ全体を単語ごとにスペースで区切って表記してください。",
  ].join("\n");
}

export function buildPhoneticPrompt(params: { entryType: EntryType; text: string }): string {
  const { entryType, text } = params;
  const label = entryType === "idiom" ? "熟語・慣用句" : "単語";
  return `${label}: ${text}\n\nこの${label}のIPA発音表記を答えてください。`;
}

export function buildUsageNoteSystemInstruction(): string {
  return [
    "あなたは英語学習者(日本人のTOEIC受験者)を支援する語彙コーチです。",
    "入力された単語について、TOEIC学習者が知っておくと得する語法・語感上の特徴を、次の観点で確認してください:",
    "1. 相性の良い前置詞(コロケーション)。例: depend on / responsible for / interested in のような、その単語特有の決まった前置詞の組み合わせ",
    "2. 後置修飾で使われる形容詞の場合、その用法と英語の例(例: something available / the people present / the only option possible)",
    "3. その単語を使った特徴的な言い回し・決まり文句(定型表現)。例: in accordance with / on behalf of / make a decision のような、ビジネス英語・TOEICで頻出する組み合わせ表現",
    "4. その他、可算・不可算の区別、自動詞・他動詞の使い分け、フォーマル度・使われる場面のニュアンスなど、TOEICで間違えやすい・知っておくと役立つ語法上の特徴",
    "該当する内容がある場合は、日本語で1〜3文程度の簡潔なメモにまとめてください。英語のコロケーション・言い回し・例文はそのまま英語で書いてください。",
    "該当する内容が特に無い場合は、「特記事項はありません。」とだけ答えてください。",
  ].join("\n");
}

export function buildUsageNotePrompt(params: {
  word: string;
  meaning: string;
  partOfSpeech: PartOfSpeech;
}): string {
  const { word, meaning, partOfSpeech } = params;
  return [
    `単語: ${word}`,
    `品詞: ${POS_LABEL[partOfSpeech]}`,
    `意味(参考): ${meaning}`,
    "",
    "この単語について、語法上の注意点(前置詞コロケーション・後置修飾など)があれば教えてください。",
  ].join("\n");
}

export function buildMeaningSystemInstruction(): string {
  return [
    "あなたは英語学習者(日本人のTOEIC受験者)を支援する語彙コーチです。",
    "入力された英単語・熟語について、最も一般的でTOEICに頻出する意味を日本語で1つだけ簡潔に答えます。",
    "複数の意味がある場合は、TOEIC(ビジネス英語)の文脈で最も典型的なものを選んでください。",
    "説明文ではなく、辞書の訳語のように短く(「〜する」「〜な」「〜(名詞)」のような数語)答えてください。",
    "入力が不完全な単語(タイピング途中)の場合は、最も近いと思われる実在の単語として推測して答えてください。該当する単語が思い当たらない場合は空文字を返してください。",
  ].join("\n");
}

export function buildMeaningPrompt(params: { entryType: EntryType; text: string }): string {
  const { entryType, text } = params;
  const label = entryType === "idiom" ? "熟語・慣用句" : "単語";
  return `${label}: ${text}\n\nこの${label}の日本語の意味を1つ答えてください。`;
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
