import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeForPhonetic } from "@/lib/anthropic";
import { buildPhoneticPrompt, buildPhoneticSystemInstruction } from "@/lib/promptBuilder";
import { ENTRY_TYPES } from "@/types/word";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  entryType: z.enum(ENTRY_TYPES).default("word"),
  text: z.string().min(1).max(100),
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
    return NextResponse.json({ error: "text は必須です。" }, { status: 400 });
  }

  const { entryType, text } = parsedBody.data;

  const systemInstruction = buildPhoneticSystemInstruction();
  const userPrompt = buildPhoneticPrompt({ entryType, text });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const phonetic = await callClaudeForPhonetic({ systemInstruction, userPrompt });
      return NextResponse.json({ phonetic: phonetic.trim() });
    } catch (err) {
      lastError = err;
      console.error(`発音記号の生成に失敗(試行${attempt}/${MAX_ATTEMPTS}):`, err);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "不明なエラーが発生しました。";
  return NextResponse.json(
    { error: `発音記号の生成に失敗しました: ${message}` },
    { status: 502 }
  );
}
