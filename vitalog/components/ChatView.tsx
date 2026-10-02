"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildChatSummary } from "@/lib/chatContext";
import {
  DEFAULT_CHAT_SETTINGS,
  loadChatSettings,
  saveChatSettings,
  type ChatSettings,
} from "@/lib/chatSettings";
import { MAX_USER_NOTES_CHARS } from "@/lib/chatPrompt";
import { MAX_MESSAGE_CHARS } from "@/lib/chatRequest";
import { useDailyLogs } from "@/lib/useDailyLogs";
import { useMedications } from "@/lib/useMedications";

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  /** assistantの返信の種類。fixed(固定文)は目立つ見た目にする */
  source?: "model" | "fixed" | "filtered" | "error";
}

const STARTERS = [
  "直近30日の記録から、どんなことが見えますか?",
  "次の診察で主治医に聞くことを整理したいです",
  "記録の取り方で、改善できる点はありますか?",
];

export default function ChatView() {
  const { dailyLogs, ready } = useDailyLogs();
  const { registeredMedications } = useMedications();
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(loadChatSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const update = (changes: Partial<ChatSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...changes };
      saveChatSettings(next);
      return next;
    });
  };

  // 送信する要約。画面で内容を確認できるようにするため、描画のたびに作る(会話中の変更にも追随)
  const summary = useMemo(
    () => (ready ? buildChatSummary(dailyLogs, registeredMedications, { includeMemos: settings.includeMemos }) : null),
    [ready, dailyLogs, registeredMedications, settings.includeMemos]
  );

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending || !summary) return;
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 画面に出した固定文・エラー表示は、LLMへの会話履歴には含めない
          messages: history
            .filter((m) => m.source === undefined || m.source === "model" || m.role === "user")
            .map((m) => ({ role: m.role, content: m.content })),
          summary,
          concise: settings.concise,
          userNotes: settings.userNotes,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; reply: string; source: UiMessage["source"] }
        | { ok: false; message: string }
        | null;
      if (data && data.ok) {
        setMessages([...history, { role: "assistant", content: data.reply, source: data.source }]);
      } else {
        const msg = data && !data.ok ? data.message : "チャットを利用できませんでした。";
        setMessages([...history, { role: "assistant", content: msg, source: "error" }]);
      }
    } catch {
      setMessages([
        ...history,
        { role: "assistant", content: "通信に失敗しました。時間をおいて再度お試しください。", source: "error" },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!settingsLoaded || !ready) return null;

  if (!settings.consented) {
    return (
      <div className="card">
        <h2>相談(AIアシスタント)</h2>
        <p>
          記録から見えるパターンを整理し、主治医との面談で使える形にするお手伝いをします。
          <strong>診断や治療の助言はしません。</strong>
        </p>
        <h3>送信されるデータについて</h3>
        <ul>
          <li>
            直近30日の記録を<strong>集計した要約</strong>
            (体調スコアの平均、症状の日数、服薬の状況、検査値の最新値、アプリの警告の状態など)が、
            このアプリのサーバーを経由して、Anthropic社のAPIに送信されます。
          </li>
          <li>記録の生データ、写真は送りません。自由メモは、下の設定で許可しない限り送りません。</li>
          <li>
            送信する内容は、チャット画面の「送信される要約を見る」でいつでも確認できます。
            Anthropic社でのデータの扱いは、同社の規約・設定によります。このアプリは、保管の条件を保証できません。
          </li>
          <li>AIの返信は誤ることがあります。重要な判断は主治医に相談してください。</li>
        </ul>
        <button type="button" className="btn-primary" onClick={() => update({ consented: true })}>
          内容を理解して、使う
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>相談(AIアシスタント)</h2>
        <p className="field-hint">
          診断や治療の助言はしません。統計的な有意差検定もしていません。自己記録に基づく傾向の整理です。
          強い症状があるときは、このチャットではなく医療機関に連絡してください。
        </p>

        <details>
          <summary>設定と、送信される要約を見る</summary>
          <div className="field" style={{ marginTop: 8 }}>
            <label>
              <input type="checkbox" checked={settings.concise} onChange={(e) => update({ concise: e.target.checked })} />{" "}
              短く答える(体調が悪い日向け)
            </label>
            <label style={{ display: "block", marginTop: 6 }}>
              <input
                type="checkbox"
                checked={settings.includeMemos}
                onChange={(e) => update({ includeMemos: e.target.checked })}
              />{" "}
              直近の自由メモ(最大10件)も送る
            </label>
          </div>
          <div className="field">
            <label htmlFor="chatNotes">自分についてのメモ(任意・この端末にだけ保存)</label>
            <textarea
              id="chatNotes"
              rows={3}
              maxLength={MAX_USER_NOTES_CHARS}
              value={settings.userNotes}
              onChange={(e) => update({ userNotes: e.target.value })}
              placeholder="例: 説明は専門用語を使ってよい/不安が強いので言葉づかいはやさしく"
            />
          </div>
          <p className="field-hint">送信される要約(JSON):</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.75rem", maxHeight: 240, overflow: "auto" }}>
            {summary ? JSON.stringify(summary, null, 2) : ""}
          </pre>
          <button type="button" className="btn-ghost" onClick={() => update({ consented: false })}>
            同意を取り消す
          </button>
        </details>
      </div>

      <div className="card">
        {messages.length === 0 && (
          <div>
            <p className="muted">例えば、こんなことを聞けます:</p>
            <div className="row">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={sending}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.source === "fixed" ? "danger-banner" : m.source === "error" ? "status-note" : undefined}
            style={{
              margin: "10px 0",
              padding: 10,
              borderRadius: 10,
              background: m.role === "user" ? "var(--color-border)" : undefined,
              textAlign: m.role === "user" ? "right" : "left",
              whiteSpace: "pre-wrap",
            }}
          >
            <div className="muted" style={{ fontSize: "0.75rem" }}>
              {m.role === "user" ? "あなた" : m.source === "fixed" ? "案内(固定文)" : "Vitalog Assistant"}
              {m.source === "filtered" && "(診断・治療に踏み込む表現を避けるため、回答を置き換えました)"}
            </div>
            {m.content}
          </div>
        ))}
        {sending && <p className="muted">考えています…</p>}
        <div ref={endRef} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{ marginTop: 12 }}
        >
          <textarea
            rows={3}
            value={input}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(e) => setInput(e.target.value)}
            placeholder="質問を入力"
            aria-label="質問"
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button type="submit" className="btn-primary" disabled={sending || input.trim().length === 0}>
              送信
            </button>
            {messages.length > 0 && (
              <button type="button" className="btn-ghost" onClick={() => setMessages([])}>
                会話を消す
              </button>
            )}
          </div>
          <p className="field-hint">会話はこの画面を閉じると消えます(保存しません)。</p>
        </form>
      </div>
    </>
  );
}
