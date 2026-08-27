import { Certification } from "../types";

// 貯金で取得できる資格。一度取得すれば効果はずっと残る（恒久的な技術力/コミュ力の底上げ）
export const CERTIFICATIONS: Certification[] = [
  { id: "g_kentei", emoji: "🧠", name: "G検定（ジェネラリスト検定）", cost: 8, techGain: 8, commGain: 0, log: "G検定に合格した。AI全体を俯瞰する視点が身についた。" },
  { id: "kihon_joho", emoji: "💻", name: "基本情報技術者試験", cost: 5, techGain: 6, commGain: 0, log: "基本情報技術者試験に合格した。基礎力が底上げされた。" },
  { id: "toeic", emoji: "🌍", name: "TOEIC高得点を取る", cost: 10, techGain: 0, commGain: 8, log: "TOEICで高得点を取得した。英語でのやり取りに自信がついた。" },
  { id: "toukei", emoji: "📐", name: "統計検定", cost: 7, techGain: 7, commGain: 0, log: "統計検定に合格した。データを見る目が鋭くなった。" },
  { id: "chusho", emoji: "📋", name: "中小企業診断士", cost: 15, techGain: 0, commGain: 10, log: "中小企業診断士の資格を取得した。経営視点が身についた。" },
  { id: "pmp", emoji: "🗂️", name: "PMP（プロジェクトマネジメント）", cost: 12, techGain: 3, commGain: 6, log: "PMPを取得した。プロジェクトを前に進める力が上がった。" },
];
