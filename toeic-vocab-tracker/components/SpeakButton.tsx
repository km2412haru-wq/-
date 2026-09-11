"use client";

import { useEffect, useState } from "react";
import { isSpeechSupported, speak } from "@/lib/speech";

export default function SpeakButton({
  text,
  lang = "en-US",
  className = "speak-btn",
}: {
  text: string;
  lang?: string;
  className?: string;
}) {
  // SSRとのハイドレーション不一致を避けるため、対応判定はマウント後に行う
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang);
      }}
      aria-label={`「${text}」を読み上げ`}
      title="発音を読み上げ"
    >
      🔊
    </button>
  );
}
