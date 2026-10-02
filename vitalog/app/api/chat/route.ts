import { NextResponse } from "next/server";
import { chatReply } from "@/lib/anthropic";
import { buildSystemPrompt } from "@/lib/chatPrompt";
import { validateChatRequest } from "@/lib/chatRequest";
import { detectSafetyTrigger, fixedReplyFor, sanitizeReply } from "@/lib/chatSafety";

/**
 * チャット(Vitalog Assistant)。応答の種類(source)は画面での見せ方を変えるために返す:
 *   fixed: 危険症状・つらい気持ちの訴えに対する固定文(LLMを呼ばない)
 *   filtered: LLMの出力が禁止表現に該当したため、固定の案内に置き換えた
 *   model: LLMの返信
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = validateChatRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
  }
  const { messages, summary, concise, userNotes } = parsed.value;

  // 危険症状・つらい気持ちは、LLMを通さず固定文で返す(取りこぼしを避けるため直近の発言だけでなく、
  // 直近の利用者の発言2件を見る)
  const recentUserTexts = messages.filter((m) => m.role === "user").slice(-2).map((m) => m.content);
  for (const text of recentUserTexts.reverse()) {
    const trigger = detectSafetyTrigger(text);
    if (trigger) {
      return NextResponse.json({ ok: true, reply: fixedReplyFor(trigger), source: "fixed", trigger });
    }
  }

  try {
    const raw = await chatReply(buildSystemPrompt(summary, { concise, userNotes }), messages);
    const { reply, filteredReason } = sanitizeReply(raw);
    if (filteredReason) console.warn("チャットの返信を置き換えました:", filteredReason);
    return NextResponse.json({ ok: true, reply, source: filteredReason ? "filtered" : "model" });
  } catch (err) {
    console.error("チャットの返信に失敗しました:", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          "チャットを利用できませんでした(APIキーが未設定か、通信に失敗しました)。記録機能には影響しません。",
      },
      { status: 503 }
    );
  }
}
