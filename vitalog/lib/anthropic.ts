import Anthropic from "@anthropic-ai/sdk";
import type { PhotoCaptureKind } from "@/types/photoCapture";

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

const EXTRACT_TOOLS: Record<PhotoCaptureKind, Anthropic.Tool> = {
  medication: {
    name: "extract_medication",
    description: "薬のパッケージ・お薬シート・説明書の写真から薬品名と用量を抽出する",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "薬品名。読み取れない場合は省略" },
        dose: { type: "string", description: "用量(単位込みの自由記述、例: '5mg')。読み取れない場合は省略" },
      },
    },
  },
  topical: {
    name: "extract_topical",
    description: "シップ・ローション等、外用薬パッケージの写真から品目名と使用部位を抽出する",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "品目名。読み取れない場合は省略" },
        site: { type: "string", description: "使用部位(パッケージやメモに記載があれば)。読み取れない場合は省略" },
        note: { type: "string", description: "その他気づいた点(任意)" },
      },
    },
  },
  labResult: {
    name: "extract_lab_result",
    description: "血液検査結果票の写真から数値を抽出する。数値は単位を除いた数値のみ返す",
    input_schema: {
      type: "object",
      properties: {
        wbcPerUl: { type: "number", description: "白血球数(WBC, /μL)" },
        ferritinNgMl: { type: "number", description: "フェリチン(ng/mL)" },
        crpMgDl: { type: "number", description: "CRP(mg/dL)" },
        astUL: { type: "number", description: "AST(U/L)" },
        altUL: { type: "number", description: "ALT(U/L)" },
        plateletsPerUl: { type: "number", description: "血小板数(/μL)" },
      },
    },
  },
};

const EXTRACT_SYSTEM_PROMPT =
  "あなたは慢性疾患(成人スティル病)の体調記録アプリの補助です。写真から読み取れる項目だけをtool_useで返してください。" +
  "読み取れない・写っていない項目は省略し、絶対に推測や補完をしないでください。" +
  "検査結果票の場合、氏名や病院名など個人情報は無視し、数値項目のみを抽出してください。" +
  "診断や医学的判断は行わないでください。";

/**
 * F1拡張: 写真からの自動記録。
 * メモのタグ付けと同じコスト最適化方針(低頻度=Haiku)だが、vision入力が必要なため
 * 通常のテキスト処理とは別にモデルを指定できるようにしている
 * (ANTHROPIC_VISION_MODEL未設定時はANTHROPIC_MODEL、それも未設定ならHaikuにフォールバック)。
 *
 * 抽出結果はそのまま保存してはいけない。呼び出し側(API route)・UI側で
 * 必ずユーザーの確認・編集を経てからDailyLogにマージすること。
 */
export async function extractFromPhoto(
  kind: PhotoCaptureKind,
  imageBase64: string,
  mediaType: string
): Promise<Record<string, unknown>> {
  const client = getClient();
  const model =
    process.env.ANTHROPIC_VISION_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    "claude-haiku-4-5-20251001";
  const tool = EXTRACT_TOOLS[kind];

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system: EXTRACT_SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: imageBase64,
            },
          },
          { type: "text", text: "この写真から読み取れる項目を抽出してください。" },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return {};
  return toolUse.input as Record<string, unknown>;
}
