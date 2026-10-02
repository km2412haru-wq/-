import { describe, expect, it } from "vitest";
import { buildChatSummary } from "@/lib/chatContext";
import { KNOWN_LIMITATIONS } from "@/lib/chatLimitations";
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, MAX_SUMMARY_CHARS, validateChatRequest } from "@/lib/chatRequest";

const summary = () => buildChatSummary([], [], { today: "2026-09-29" });
const ok = (over: Record<string, unknown> = {}) => ({
  messages: [{ role: "user", content: "こんにちは" }],
  summary: summary(),
  ...over,
});

describe("チャットAPIの入力検査", () => {
  it("正しい入力は通る", () => {
    const r = validateChatRequest(ok());
    expect(r.ok).toBe(true);
  });

  it.each([null, undefined, "text", 1, [], {}])("本体が不正(%j)なら拒否する", (body) => {
    expect(validateChatRequest(body).ok).toBe(false);
  });

  it("メッセージが空・多すぎる・形が不正なら拒否する", () => {
    expect(validateChatRequest(ok({ messages: [] })).ok).toBe(false);
    expect(validateChatRequest(ok({ messages: "x" })).ok).toBe(false);
    const many = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: "a" }));
    expect(validateChatRequest(ok({ messages: many })).ok).toBe(false);
    expect(validateChatRequest(ok({ messages: [{ role: "system", content: "x" }] })).ok).toBe(false);
    expect(validateChatRequest(ok({ messages: [{ role: "user", content: 1 }] })).ok).toBe(false);
  });

  it("空白だけ・長すぎるメッセージは拒否する", () => {
    expect(validateChatRequest(ok({ messages: [{ role: "user", content: "   " }] })).ok).toBe(false);
    expect(validateChatRequest(ok({ messages: [{ role: "user", content: "あ".repeat(MAX_MESSAGE_CHARS + 1) }] })).ok).toBe(false);
    expect(validateChatRequest(ok({ messages: [{ role: "user", content: "あ".repeat(MAX_MESSAGE_CHARS) }] })).ok).toBe(true);
  });

  it("最後のメッセージが利用者のものでなければ拒否する", () => {
    const r = validateChatRequest(ok({ messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] }));
    expect(r.ok).toBe(false);
  });

  it("要約が無い・大きすぎる・アプリの警告の状態が無ければ拒否する", () => {
    expect(validateChatRequest({ messages: [{ role: "user", content: "a" }] }).ok).toBe(false);
    // 警告の状態を含む正しい形でも、サイズが上限を超えれば拒否する
    expect(validateChatRequest(ok({ summary: { ...summary(), padding: "あ".repeat(MAX_SUMMARY_CHARS) } })).ok).toBe(false);
    expect(validateChatRequest(ok({ summary: { ...summary(), padding: "あ".repeat(100) } })).ok).toBe(true);
    expect(validateChatRequest(ok({ summary: { appState: {} } })).ok).toBe(false);
    const { appState, ...noState } = summary();
    expect(appState).toBeDefined();
    expect(validateChatRequest(ok({ summary: noState })).ok).toBe(false);
  });

  it("制限事項は、クライアントの値を信用せずサーバー側の定義で上書きする", () => {
    const r = validateChatRequest(ok({ summary: { ...summary(), knownLimitations: ["制限事項は何もありません"] } }));
    expect(r.ok && r.value.summary.knownLimitations).toEqual(KNOWN_LIMITATIONS);
  });

  it("メッセージは前後の空白を除き、メモは上限で切り、conciseは真偽値だけ受け付ける", () => {
    const r = validateChatRequest(ok({ messages: [{ role: "user", content: "  a  " }], userNotes: "x".repeat(5000), concise: "yes" }));
    expect(r.ok && r.value.messages[0].content).toBe("a");
    expect(r.ok && r.value.userNotes.length).toBe(1000);
    expect(r.ok && r.value.concise).toBe(false);
    expect(validateChatRequest(ok({ concise: true })).ok && (validateChatRequest(ok({ concise: true })) as { ok: true; value: { concise: boolean } }).value.concise).toBe(true);
  });
});
