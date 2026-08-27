export interface TitleTier {
  threshold: number;
  name: string;
  desc: string;
}

// 累計評価スコア(reputation)に応じた称号
export const TITLES: TitleTier[] = [
  { threshold: 0, name: "見習いエンジニア", desc: "すべてはここから始まる。" },
  { threshold: 40, name: "駆け出しAIエンジニア", desc: "コミットが少しずつ形になってきた。" },
  { threshold: 100, name: "一人前のMLエンジニア", desc: "一通りの開発を任されるようになった。" },
  { threshold: 200, name: "AIマイスター", desc: "社内で頼られる存在になった。" },
  { threshold: 350, name: "プロダクトの賢者", desc: "プロダクトの意思決定に深く関わる。" },
  { threshold: 550, name: "テックリード・オブ・カオス", desc: "混沌をねじ伏せる技術力を身につけた。" },
  { threshold: 800, name: "伝説のCTO", desc: "業界にその名を知られる存在に。" },
  { threshold: 1200, name: "AI業界の生き字引", desc: "殿堂入り目前、伝説はまだ続く。" },
];

export function titleForReputation(reputation: number): TitleTier {
  let current = TITLES[0];
  for (const t of TITLES) {
    if (reputation >= t.threshold) current = t;
  }
  return current;
}

export function nextTitle(reputation: number): TitleTier | null {
  for (const t of TITLES) {
    if (reputation < t.threshold) return t;
  }
  return null;
}
