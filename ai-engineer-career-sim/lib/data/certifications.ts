import { Certification } from "../types";

// 「資格勉強をする」アクションで少しずつ習熟度を積み上げて取得する資格。
// 一度取得すれば効果はずっと残る（恒久的な技術力/コミュ力の底上げ）
export const CERTIFICATIONS: Certification[] = [
  { id: "g_kentei", emoji: "🧠", name: "G検定（ジェネラリスト検定）", studyPerSession: 34, techGain: 8, commGain: 0, log: "G検定に合格した。AI全体を俯瞰する視点が身についた。" },
  { id: "kihon_joho", emoji: "💻", name: "基本情報技術者試験", studyPerSession: 50, techGain: 6, commGain: 0, log: "基本情報技術者試験に合格した。基礎力が底上げされた。" },
  { id: "toeic", emoji: "🌍", name: "TOEIC高得点を取る", studyPerSession: 25, techGain: 0, commGain: 8, log: "TOEICで高得点を取得した。英語でのやり取りに自信がついた。" },
  { id: "toukei", emoji: "📐", name: "統計検定", studyPerSession: 34, techGain: 7, commGain: 0, log: "統計検定に合格した。データを見る目が鋭くなった。" },
  { id: "chusho", emoji: "📋", name: "中小企業診断士", studyPerSession: 20, techGain: 0, commGain: 10, log: "中小企業診断士の資格を取得した。経営視点が身についた。" },
  { id: "pmp", emoji: "🗂️", name: "PMP（プロジェクトマネジメント）", studyPerSession: 25, techGain: 3, commGain: 6, log: "PMPを取得した。プロジェクトを前に進める力が上がった。" },
];
