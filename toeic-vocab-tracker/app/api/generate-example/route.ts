import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeForExample } from "@/lib/anthropic";
import { buildExamplePrompt, buildExampleSystemInstruction } from "@/lib/promptBuilder";
import { ENTRY_TYPES, PARTS_OF_SPEECH } from "@/types/word";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  entryType: z.enum(ENTRY_TYPES).default("word"),
  text: z.string().min(1).max(200),
  meaning: z.string().min(1).max(300),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).default("other"),
});

/** 応答が壊れていた場合、生成をやり直す最大回数 */
const MAX_ATTEMPTS = 2;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディがJSONとして解析できませんでした。" },
      { status: 400 }
    );
  }

  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "text / meaning は必須です。" },
      { status: 400 }
    );
  }

  const { entryType, text, meaning, partOfSpeech } = parsedBody.data;

  const systemInstruction = buildExampleSystemInstruction();
  const userPrompt = buildExamplePrompt({ entryType, text, meaning, partOfSpeech });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callClaudeForExample({ systemInstruction, userPrompt });
      return NextResponse.json({
        example: { en: raw.exampleEn.trim(), ja: raw.exampleJa.trim() },
      });
    } catch (err) {
      lastError = err;
      console.error(`例文の生成に失敗(試行${attempt}/${MAX_ATTEMPTS}):`, err);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "不明なエラーが発生しました。";
  return NextResponse.json(
    { error: `例文の生成に失敗しました: ${message}` },
    { status: 502 }
  );
}
