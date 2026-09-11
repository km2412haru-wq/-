/**
 * ブラウザ標準のWeb Speech API(無料・API課金なし)で英語テキストを読み上げる。
 * 未対応ブラウザでは何もしない。
 */
export function speak(text: string, lang: string = "en-US"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!text.trim()) return;

  // 連続タップで音声が重ならないよう、再生中のものは止めてから話す
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.92; // 学習者向けに少しゆっくり
  window.speechSynthesis.speak(utterance);
}

/** 現在の環境がWeb Speech APIに対応しているか */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
