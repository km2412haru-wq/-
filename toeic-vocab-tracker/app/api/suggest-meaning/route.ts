import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeForMeaning } from "@/lib/anthropic";
import { buildMeaningPrompt, buildMeaningSystemInstruction } from "@/lib/promptBuilder";
import { ENTRY_TYPES } from "@/types/word";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  entryType: z.enum(ENTRY_TYPES).default("word"),
  text: z.string().min(2).max(100),
});

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
    return NextResponse.json({ error: "text は2文字以上で指定してください。" }, { status: 400 });
  }

  const { entryType, text } = parsedBody.data;

  const systemInstruction = buildMeaningSystemInstruction();
  const userPrompt = buildMeaningPrompt({ entryType, text });

  try {
    const meaning = await callClaudeForMeaning({ systemInstruction, userPrompt });
    return NextResponse.json({ meaning: meaning.trim() });
  } catch (err) {
    console.error("意味予測に失敗:", err);
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました。";
    return NextResponse.json({ error: `意味予測に失敗しました: ${message}` }, { status: 502 });
  }
}
