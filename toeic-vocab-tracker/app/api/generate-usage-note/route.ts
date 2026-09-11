import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeForUsageNote } from "@/lib/anthropic";
import { buildUsageNotePrompt, buildUsageNoteSystemInstruction } from "@/lib/promptBuilder";
import { PARTS_OF_SPEECH } from "@/types/word";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  word: z.string().min(1).max(100),
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
      { error: "word / meaning は必須です。" },
      { status: 400 }
    );
  }

  const { word, meaning, partOfSpeech } = parsedBody.data;

  const systemInstruction = buildUsageNoteSystemInstruction();
  const userPrompt = buildUsageNotePrompt({ word, meaning, partOfSpeech });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const note = await callClaudeForUsageNote({ systemInstruction, userPrompt });
      return NextResponse.json({ note: note.trim() });
    } catch (err) {
      lastError = err;
      console.error(`語法メモの生成に失敗(試行${attempt}/${MAX_ATTEMPTS}):`, err);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "不明なエラーが発生しました。";
  return NextResponse.json(
    { error: `語法メモの生成に失敗しました: ${message}` },
    { status: 502 }
  );
}
