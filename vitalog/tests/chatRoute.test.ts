// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const chatReplyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/anthropic", () => ({ chatReply: chatReplyMock }));

import { POST } from "@/app/api/chat/route";
import { buildChatSummary } from "@/lib/chatContext";
import { DANGER_FIXED_REPLY, REPLY_FALLBACK, SELF_HARM_FIXED_REPLY } from "@/lib/chatSafety";

const summary = () => buildChatSummary([], [], { today: "2026-09-29" });

function req(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const msg = (content: string, role: "user" | "assistant" = "user") => ({ role, content });

beforeEach(() => {
  chatReplyMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/chat", () => {
  it("不正な入力は400で、LLMを呼ばない", async () => {
    const res = await POST(req({ messages: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
    expect((await POST(req("not json"))).status).toBe(400);
    expect(chatReplyMock).not.toHaveBeenCalled();
  });

  it("通常の質問は、LLMの返信をそのまま返す(source: model)", async () => {
    chatReplyMock.mockResolvedValue("直近30日の体調スコアの平均は5.2です。");
    const res = await POST(req({ messages: [msg("傾向を教えて")], summary: summary() }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, reply: "直近30日の体調スコアの平均は5.2です。", source: "model" });
  });

  it("LLMには、システムプロンプト(警告の状態・要約を含む)と会話履歴が渡る", async () => {
    chatReplyMock.mockResolvedValue("ok");
    await POST(req({ messages: [msg("a"), msg("b", "assistant"), msg("c")], summary: summary(), concise: true, userNotes: "やさしく" }));
    const [system, messages] = chatReplyMock.mock.calls[0];
    expect(system).toContain("<app_state>");
    expect(system).toContain("<data_summary>");
    expect(system).toContain("5文以内");
    expect(system).toContain("やさしく");
    expect(messages).toEqual([msg("a"), msg("b", "assistant"), msg("c")]);
  });

  it("危険症状の訴えは、LLMを呼ばずに固定文を返す", async () => {
    const res = await POST(req({ messages: [msg("息が苦しいです")], summary: summary() }));
    const data = await res.json();
    expect(data).toEqual({ ok: true, reply: DANGER_FIXED_REPLY, source: "fixed", trigger: "danger" });
    expect(chatReplyMock).not.toHaveBeenCalled();
  });

  it("つらい気持ちの訴えも、LLMを呼ばずに固定文を返す", async () => {
    const res = await POST(req({ messages: [msg("もう死にたい")], summary: summary() }));
    const data = await res.json();
    expect(data.reply).toBe(SELF_HARM_FIXED_REPLY);
    expect(data.trigger).toBe("selfHarm");
    expect(chatReplyMock).not.toHaveBeenCalled();
  });

  it("直前の発言に危険症状があれば、次の発言(例: どうすれば?)でも固定文を返す", async () => {
    const res = await POST(
      req({ messages: [msg("胸が痛いです"), msg("案内です", "assistant"), msg("どうしたらいいですか?")], summary: summary() })
    );
    expect((await res.json()).source).toBe("fixed");
    expect(chatReplyMock).not.toHaveBeenCalled();
  });

  it("3つ以上前の発言の危険症状は、固定文の対象にしない(会話が延々と固定文にならない)", async () => {
    chatReplyMock.mockResolvedValue("ok");
    const res = await POST(
      req({
        messages: [msg("胸が痛いです"), msg("案内", "assistant"), msg("ありがとう"), msg("案内", "assistant"), msg("睡眠の傾向を教えて")],
        summary: summary(),
      })
    );
    expect((await res.json()).source).toBe("model");
  });

  it("LLMの返信が禁止表現に該当したら、固定の案内に置き換える(source: filtered)", async () => {
    chatReplyMock.mockResolvedValue("大丈夫ですよ。薬を減らしてください。");
    const data = await (await POST(req({ messages: [msg("傾向を教えて")], summary: summary() }))).json();
    expect(data).toEqual({ ok: true, reply: REPLY_FALLBACK, source: "filtered" });
  });

  it("LLMの呼び出しが失敗(APIキー未設定・通信エラー)したら、503でその旨を返す", async () => {
    chatReplyMock.mockRejectedValue(new Error("ANTHROPIC_API_KEY が設定されていません"));
    const res = await POST(req({ messages: [msg("傾向を教えて")], summary: summary() }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.message).toContain("利用できませんでした");
    expect(data.message).toContain("記録機能には影響しません");
  });

  it("エラーの詳細(APIキーの有無など)を利用者に返さない", async () => {
    chatReplyMock.mockRejectedValue(new Error("secret internal detail sk-ant-xxx"));
    const data = await (await POST(req({ messages: [msg("a")], summary: summary() }))).json();
    expect(JSON.stringify(data)).not.toContain("secret");
    expect(JSON.stringify(data)).not.toContain("sk-ant");
  });
});
