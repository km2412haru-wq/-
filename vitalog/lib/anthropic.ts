import Anthropic from "@anthropic-ai/sdk";

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

const TAG_MEMO_TOOL: Anthropic.Tool = {
  name: "tag_memo",
  description: "自由メモから、体調管理上意味のある短いタグを抽出する",
  input_schema: {
    type: "object",
    properties: {
      tags: {
        type: "array",
        description:
          "メモの内容を表す短いタグ(名詞句)のリスト。症状・きっかけ・出来事など。該当なしなら空配列",
        items: { type: "string" },
      },
    },
    required: ["tags"],
  },
};

/**
 * 日次のメモタグ付け(低頻度・低コストのHaikuを既定モデルとして使用)。
 * 生の記録データではなく、メモ本文だけをLLMに渡す(トークン消費を抑制する非機能要件のため)。
 */
export async function tagMemo(memo: string): Promise<string[]> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 256,
    system:
      "あなたは慢性疾患(成人スティル病)の体調記録アプリの補助です。ユーザーの自由メモから、後で検索・分析しやすい短いタグ(体調・症状・生活イベント等)を抽出してください。診断や医学的助言は行わないでください。",
    tools: [TAG_MEMO_TOOL],
    tool_choice: { type: "tool", name: "tag_memo" },
    messages: [{ role: "user", content: memo }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return [];

  const input = toolUse.input as { tags?: unknown };
  if (!Array.isArray(input.tags)) return [];
  return input.tags.filter((t): t is string => typeof t === "string");
}
