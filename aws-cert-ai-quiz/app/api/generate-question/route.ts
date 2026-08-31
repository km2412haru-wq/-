import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getExamGuide } from "@/data/examGuides";
import { pickTopics, pickWeightedDomain } from "@/lib/domainPicker";
import { callGeminiForQuestion } from "@/lib/gemini";
import { buildQuestionPrompt, buildSystemInstruction } from "@/lib/promptBuilder";
import { validateGeminiQuestion } from "@/lib/validateQuestion";
import type { GeneratedQuestion } from "@/types/quiz";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  exam: z.enum(["CP", "SAA"]),
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
      { error: "exam は 'CP' または 'SAA' を指定してください。" },
      { status: 400 }
    );
  }

  const { exam } = parsedBody.data;
  const examGuide = getExamGuide(exam);
  const domain = pickWeightedDomain(examGuide);
  const topics = pickTopics(domain);

  const systemInstruction = buildSystemInstruction();
  const userPrompt = buildQuestionPrompt({ examGuide, domain, topics });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callGeminiForQuestion({ systemInstruction, userPrompt });
      const validated = validateGeminiQuestion(raw);

      const question: GeneratedQuestion = {
        exam,
        domain: domain.id,
        topics,
        ...validated,
      };

      return NextResponse.json(question);
    } catch (err) {
      lastError = err;
      console.error(`問題生成に失敗(試行${attempt}/${MAX_ATTEMPTS}):`, err);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "不明なエラーが発生しました。";
  return NextResponse.json(
    { error: `問題の生成に失敗しました: ${message}` },
    { status: 502 }
  );
}
