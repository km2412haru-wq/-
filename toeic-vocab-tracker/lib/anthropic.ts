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
