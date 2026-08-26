"use client";

import { useState } from "react";

export default function AskClaudeBox({ countryName }: { countryName: string }) {
  const [question, setQuestion] = useState("");

  function handleAsk() {
    const q = question.trim();
    if (!q) return;
    const prompt = `「${countryName}」の歴史について質問です。文系大学生にもわかるやさしい言葉で教えてください。\n\n質問: ${q}`;
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="eraSection">
      <h2 className="eraLabel">🤖 気になることをクロードに聞く</h2>
      <div className="askRow">
        <input
          className="searchInput"
          type="text"
          placeholder={`${countryName}について気になることを入力…`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAsk();
          }}
        />
        <button type="button" className="askClaudeBtn" onClick={handleAsk}>
          聞いてみる →
        </button>
      </div>
      <p className="wmHint" style={{ textAlign: "left", marginTop: 8 }}>
        別タブでclaude.aiが開き、質問が自動入力された状態になります（claude.aiへのログインが必要です）。
      </p>
    </section>
  );
}
