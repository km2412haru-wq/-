import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeForDerivatives, type RawDerivative } from "@/lib/anthropic";
import { buildDerivativesPrompt, buildSystemInstruction } from "@/lib/promptBuilder";
import { PARTS_OF_SPEECH, type DerivativeSuggestion } from "@/types/word";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  word: z.string().min(1).max(100),
  meaning: z.string().min(1).max(300),
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  existingWords: z.array(z.string()).max(50).optional().default([]),
});

const derivativeSchema = z.object({
  word: z.string().min(1).max(100),
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  meaning: z.string().min(1).max(300),
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
      { error: "word / meaning / partOfSpeech は必須です。" },
      { status: 400 }
    );
  }

  const { word, meaning, partOfSpeech, existingWords } = parsedBody.data;

  const systemInstruction = buildSystemInstruction();
  const userPrompt = buildDerivativesPrompt({
    word,
    meaning,
    partOfSpeech,
    existingWords,
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callClaudeForDerivatives({ systemInstruction, userPrompt });
      const derivatives = validateDerivatives(raw, word);

      return NextResponse.json({ derivatives });
    } catch (err) {
      lastError = err;
      console.error(`派生語の提案に失敗(試行${attempt}/${MAX_ATTEMPTS}):`, err);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "不明なエラーが発生しました。";
  return NextResponse.json(
    { error: `派生語の提案に失敗しました: ${message}` },
    { status: 502 }
  );
}

/** Claudeの応答を検証し、登録元の単語自身を除いた派生語リストを返す */
function validateDerivatives(raw: RawDerivative[], rootWord: string): DerivativeSuggestion[] {
  const result: DerivativeSuggestion[] = [];
  const rootLower = rootWord.trim().toLowerCase();
  const seen = new Set<string>();

  for (const item of raw) {
    const parsed = derivativeSchema.safeParse(item);
    if (!parsed.success) continue;

    const wordLower = parsed.data.word.trim().toLowerCase();
    if (wordLower === rootLower) continue;
    if (seen.has(wordLower)) continue;
    seen.add(wordLower);

    result.push(parsed.data as DerivativeSuggestion);
  }

  return result;
}
