import type { ChatDataSummary } from "@/lib/chatContext";
import { KNOWN_LIMITATIONS } from "@/lib/chatLimitations";
import { MAX_USER_NOTES_CHARS } from "@/lib/chatPrompt";
import type { ChatMessage } from "@/lib/anthropic";

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_SUMMARY_CHARS = 16_000;

export interface ValidChatRequest {
  messages: ChatMessage[];
  summary: ChatDataSummary;
  concise: boolean;
  userNotes: string;
}

export type ChatRequestResult =
  | { ok: true; value: ValidChatRequest }
  | { ok: false; message: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * APIの入力検査。サイズと形だけを確認する(利用者本人のデータなので内容の真偽は検証しない)。
 * 制限事項の一覧はクライアントの値を信用せず、サーバー側の最新の定義で必ず上書きする。
 */
export function validateChatRequest(body: unknown): ChatRequestResult {
  if (!isRecord(body)) return { ok: false, message: "不正なリクエストです" };

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
    return { ok: false, message: "メッセージの数が不正です" };
  }
  const messages: ChatMessage[] = [];
  for (const m of rawMessages) {
    if (!isRecord(m) || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return { ok: false, message: "メッセージの形式が不正です" };
    }
    const content = m.content.trim();
    if (content.length === 0 || content.length > MAX_MESSAGE_CHARS) {
      return { ok: false, message: `メッセージは1〜${MAX_MESSAGE_CHARS}文字にしてください` };
    }
    messages.push({ role: m.role, content });
  }
  if (messages[messages.length - 1].role !== "user") {
    return { ok: false, message: "最後のメッセージは利用者のものにしてください" };
  }

  const summary = body.summary;
  if (!isRecord(summary) || JSON.stringify(summary).length > MAX_SUMMARY_CHARS) {
    return { ok: false, message: "記録の要約が不正、または大きすぎます" };
  }
  const appState = summary.appState;
  if (!isRecord(appState) || !isRecord(appState.f10) || !isRecord(appState.danger)) {
    return { ok: false, message: "アプリの警告の状態が含まれていません" };
  }

  const userNotesRaw = typeof body.userNotes === "string" ? body.userNotes : "";

  return {
    ok: true,
    value: {
      messages,
      summary: { ...(summary as unknown as ChatDataSummary), knownLimitations: KNOWN_LIMITATIONS },
      concise: body.concise === true,
      userNotes: userNotesRaw.trim().slice(0, MAX_USER_NOTES_CHARS),
    },
  };
}
