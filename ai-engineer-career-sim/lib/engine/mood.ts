import { GameState } from "../types";

// 数字を読み解かなくても「今どんな感じか」が一目でわかるようにするための
// 感覚的な指標たち（文系でもゲーム内の状況が肌感覚でつかめるように）。

export interface ProjectWeather {
  emoji: string;
  label: string;
  advice: string;
}

function clamp0to100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// プロジェクトの「今の調子」を天気にたとえて一目でわかるようにする。
// 単純な残り目標との比較ではなく、「納期に対してどれくらい進んでいるべきか」
// というペース感と比べることで、始まったばかりのプロジェクトがいきなり
// 「暴風雨」にならないようにしている。
export function projectWeather(state: GameState): ProjectWeather {
  const m = state.currentMission;
  const timeRatio = clamp0to100((1 - state.weeksLeft / Math.max(1, state.projectTotalWeeks)) * 100) / 100;
  const expectedProgress = m.successProgress * timeRatio;
  const expectedQuality = m.successQuality * Math.max(0.15, timeRatio);
  const progressGap = state.progress - expectedProgress; // プラスならペースより先行
  const qualityGap = state.quality - expectedQuality;
  const fatiguePenalty = Math.max(0, state.fatigue - 50) * 0.4;
  const health = clamp0to100(65 + progressGap * 0.6 + qualityGap * 0.5 - state.riskLevel * 0.25 - fatiguePenalty);

  if (health >= 80) return { emoji: "☀️", label: "順調そのもの", advice: "このペースを維持しよう" };
  if (health >= 55) return { emoji: "⛅", label: "まずまず順調", advice: "油断せず進めよう" };
  if (health >= 32) return { emoji: "🌥️", label: "やや雲行きが怪しい", advice: "リスクや疲労をケアしよう" };
  if (health >= 12) return { emoji: "🌧️", label: "雨模様", advice: "立て直しが必要かもしれない" };
  return { emoji: "⛈️", label: "暴風雨", advice: "かなり危険な状況。休息やリスク対策を" };
}

export interface GaugeMood {
  emoji: string;
  label: string;
}

// 予算・疲労度・トラブル発生率など「低い/高いほど良い」系のゲージに
// 一言の気分ラベルを添えて、数字を比較しなくても直感でわかるようにする
export function budgetMood(ratioPercent: number): GaugeMood {
  if (ratioPercent >= 50) return { emoji: "😌", label: "まだ余裕がある" };
  if (ratioPercent >= 20) return { emoji: "😐", label: "計画的に使おう" };
  return { emoji: "😰", label: "かなり厳しい" };
}

export function fatigueMood(fatigue: number): GaugeMood {
  if (fatigue < 30) return { emoji: "😊", label: "元気いっぱい" };
  if (fatigue < 60) return { emoji: "🙂", label: "まだ大丈夫" };
  if (fatigue < 85) return { emoji: "😣", label: "かなり疲れている" };
  return { emoji: "🥵", label: "限界に近い" };
}

export function riskMood(risk: number): GaugeMood {
  if (risk < 25) return { emoji: "🛡️", label: "安全圏" };
  if (risk < 50) return { emoji: "⚠️", label: "少し注意" };
  if (risk < 75) return { emoji: "🚨", label: "危険水域" };
  return { emoji: "🔥", label: "いつ事故が起きても不思議じゃない" };
}
