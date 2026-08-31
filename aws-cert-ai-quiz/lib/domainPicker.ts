import type { ExamDomain, ExamGuide } from "@/types/quiz";

/**
 * 公式試験ガイドの出題比率(weight)に応じた重み付きランダムでドメインを1つ選ぶ。
 *
 * Step1時点では苦手分野トラッキングによる重み調整はまだ行わない
 * (常に公式比率のみを使う)。Step3で「苦手ドメインほど重みを上げる」
 * 調整をこの関数の呼び出し側に追加する予定。
 */
export function pickWeightedDomain(guide: ExamGuide): ExamDomain {
  const totalWeight = guide.domains.reduce((sum, d) => sum + d.weight, 0);
  let r = Math.random() * totalWeight;
  for (const domain of guide.domains) {
    r -= domain.weight;
    if (r <= 0) return domain;
  }
  // 丸め誤差対策のフォールバック
  return guide.domains[guide.domains.length - 1];
}

/** ドメイン内のトピックからランダムに1〜2個選ぶ */
export function pickTopics(domain: ExamDomain, count = 2): string[] {
  const shuffled = [...domain.topics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
