import { StepFocus } from "../types";

// クイズの正解不正解ではなく、ここまで育ててきた「技術力」「コミュ力」といった
// 実力の数値そのもので合否を決める。ここでは各ステップの雰囲気だけを演出する。
const FLAVOR: Record<StepFocus, string[]> = {
  tech: [
    "実際に手を動かしてきた経験がものを言う。技術力が問われる場面だ。",
    "コードの書き方や技術的な引き出しの多さが評価されるようだ。",
    "これまで積み上げてきた技術力が、そのまま試される。",
  ],
  comm: [
    "人柄やチームでの立ち回り方が見られている。コミュ力が問われる場面だ。",
    "面接官との会話のキャッチボールが、そのまま評価につながる。",
    "価値観や人となりが重視される、コミュ力勝負の面接だ。",
  ],
  balance: [
    "技術力と人当たりの良さ、両方のバランスが試される。",
    "論理的に考え、わかりやすく説明する力が問われている。",
    "これまで積み上げてきた実力が、総合的に評価される。",
  ],
};

export const FOCUS_LABEL: Record<StepFocus, string> = {
  tech: "🔧 技術力が問われる",
  comm: "💬 コミュ力が問われる",
  balance: "⚖️ 総合力が問われる",
};

export function focusForStep(stepName: string): StepFocus {
  if (stepName.includes("コーディング")) return "tech";
  if (stepName.includes("最終") || stepName.includes("人物") || stepName.includes("カルチャー") || stepName.includes("カジュアル")) return "comm";
  return "balance"; // 書類選考・適性検査・ケース面接・技術面接など
}

export function pickFlavor(focus: StepFocus): string {
  const lines = FLAVOR[focus];
  return lines[Math.floor(Math.random() * lines.length)];
}
