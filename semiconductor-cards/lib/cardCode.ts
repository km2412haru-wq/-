// カード前面に大きく表示する短いロゴ風コード。実際のティッカーシンボルでは
// なく、社名から機械的に生成した表示用の略称（公式ロゴ画像は使わない）。
export function cardCode(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w));

  if (words.length >= 2) {
    const initials = words
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return initials.slice(0, 4);
  }

  const alnum = (words[0] ?? name).replace(/[^A-Za-z0-9]/g, "");
  return (alnum.slice(0, 4) || name.slice(0, 2)).toUpperCase();
}
