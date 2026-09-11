import Anthropic from "@anthropic-ai/sdk";
import { PARTS_OF_SPEECH } from "@/types/word";

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が設定されていません。.env.local.example を参考に .env.local を作成してください。"
    );
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/** Claudeにtool useで強制させる、派生語提案の出力スキーマ */
const SUGGEST_DERIVATIVES_TOOL: Anthropic.Tool = {
  name: "suggest_derivatives",
  description: "派生語の候補リストを返す",
  input_schema: {
    type: "object",
    properties: {
      derivatives: {
        type: "array",
        description: "提案する派生語のリスト。存在しない場合は空配列",
        items: {
          type: "object",
          properties: {
            word: { type: "string", description: "派生語(英単語)" },
            partOfSpeech: {
              type: "string",
              enum: PARTS_OF_SPEECH,
              description: "派生語の品詞",
            },
            meaning: { type: "string", description: "派生語の日本語の意味" },
          },
          required: ["word", "partOfSpeech", "meaning"],
        },
      },
    },
    required: ["derivatives"],
  },
};

/** Claude応答の生JSON(まだバリデーション前)の型 */
export interface RawDerivative {
  word: string;
  partOfSpeech: string;
  meaning: string;
}

export async function callClaudeForDerivatives(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<RawDerivative[]> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: params.systemInstruction,
    tools: [SUGGEST_DERIVATIVES_TOOL],
    tool_choice: { type: "tool", name: "suggest_derivatives" },
    messages: [{ role: "user", content: params.userPrompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude APIからの応答にtool_useブロックが含まれていませんでした。");
  }

  const input = toolUse.input as { derivatives?: unknown };
  if (!Array.isArray(input.derivatives)) {
    throw new Error("Claude APIの応答形式が不正です。");
  }

  return input.derivatives as RawDerivative[];
}

/** Claudeにtool useで強制させる、例文生成の出力スキーマ */
const GENERATE_EXAMPLE_TOOL: Anthropic.Tool = {
  name: "generate_example",
  description: "英語の例文とその日本語訳を1組返す",
  input_schema: {
    type: "object",
    properties: {
      exampleEn: { type: "string", description: "英語の例文(1文)" },
      exampleJa: { type: "string", description: "例文全体の自然な日本語訳" },
    },
    required: ["exampleEn", "exampleJa"],
  },
};

export interface RawExample {
  exampleEn: string;
  exampleJa: string;
}

export async function callClaudeForExample(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<RawExample> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system: params.systemInstruction,
    tools: [GENERATE_EXAMPLE_TOOL],
    tool_choice: { type: "tool", name: "generate_example" },
    messages: [{ role: "user", content: params.userPrompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude APIからの応答にtool_useブロックが含まれていませんでした。");
  }

  const input = toolUse.input as Partial<RawExample>;
  if (typeof input.exampleEn !== "string" || typeof input.exampleJa !== "string") {
    throw new Error("Claude APIの応答形式が不正です。");
  }

  return { exampleEn: input.exampleEn, exampleJa: input.exampleJa };
}

/** Claudeにtool useで強制させる、発音記号生成の出力スキーマ */
const GENERATE_PHONETIC_TOOL: Anthropic.Tool = {
  name: "generate_phonetic",
  description: "単語・熟語の発音記号(IPA、アクセント位置を含む)を1つ返す",
  input_schema: {
    type: "object",
    properties: {
      phonetic: {
        type: "string",
        description:
          "IPA(国際音声記号)による発音表記。/ /で囲み、第一強勢の位置にˈを付ける(例: /sɪɡˈnɪfɪkənt/)",
      },
    },
    required: ["phonetic"],
  },
};

export async function callClaudeForPhonetic(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 256,
    system: params.systemInstruction,
    tools: [GENERATE_PHONETIC_TOOL],
    tool_choice: { type: "tool", name: "generate_phonetic" },
    messages: [{ role: "user", content: params.userPrompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude APIからの応答にtool_useブロックが含まれていませんでした。");
  }

  const input = toolUse.input as { phonetic?: unknown };
  if (typeof input.phonetic !== "string") {
    throw new Error("Claude APIの応答形式が不正です。");
  }

  return input.phonetic;
}

/** Claudeにtool useで強制させる、語法メモ生成の出力スキーマ */
const GENERATE_USAGE_NOTE_TOOL: Anthropic.Tool = {
  name: "generate_usage_note",
  description: "単語の語法・言い回し上の特徴(前置詞コロケーション、後置修飾、定型表現など)のメモを返す",
  input_schema: {
    type: "object",
    properties: {
      note: {
        type: "string",
        description:
          "語法上の注意点の日本語メモ(1〜2文)。該当なしの場合は「特記事項はありません。」",
      },
    },
    required: ["note"],
  },
};

export async function callClaudeForUsageNote(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 384,
    system: params.systemInstruction,
    tools: [GENERATE_USAGE_NOTE_TOOL],
    tool_choice: { type: "tool", name: "generate_usage_note" },
    messages: [{ role: "user", content: params.userPrompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude APIからの応答にtool_useブロックが含まれていませんでした。");
  }

  const input = toolUse.input as { note?: unknown };
  if (typeof input.note !== "string") {
    throw new Error("Claude APIの応答形式が不正です。");
  }

  return input.note;
}

/** Claudeにtool useで強制させる、意味予測の出力スキーマ */
const SUGGEST_MEANING_TOOL: Anthropic.Tool = {
  name: "suggest_meaning",
  description: "単語・熟語の最も一般的な日本語の意味を1つ返す",
  input_schema: {
    type: "object",
    properties: {
      meaning: {
        type: "string",
        description: "TOEIC学習者向けの、簡潔で一般的な日本語の意味(数語程度)",
      },
    },
    required: ["meaning"],
  },
};

export async function callClaudeForMeaning(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 256,
    system: params.systemInstruction,
    tools: [SUGGEST_MEANING_TOOL],
    tool_choice: { type: "tool", name: "suggest_meaning" },
    messages: [{ role: "user", content: params.userPrompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude APIからの応答にtool_useブロックが含まれていませんでした。");
  }

  const input = toolUse.input as { meaning?: unknown };
  if (typeof input.meaning !== "string") {
    throw new Error("Claude APIの応答形式が不正です。");
  }

  return input.meaning;
}
