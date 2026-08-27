import { GameState } from "../types";

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function chance(p: number): boolean {
  return Math.random() < p;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function addLog(state: GameState, message: string): string[] {
  const next = [message, ...state.log];
  return next.slice(0, 40);
}

// アクション成功時に呼ぶ：コンボを伸ばしスコア倍率を上げる
export function bumpCombo(state: GameState): Pick<GameState, "comboCount" | "scoreMultiplier"> {
  const comboCount = state.comboCount + 1;
  const scoreMultiplier = clamp(1 + Math.floor(comboCount / 3) * 0.1, 1, 2);
  return { comboCount, scoreMultiplier };
}

export function resetCombo(): Pick<GameState, "comboCount" | "scoreMultiplier"> {
  return { comboCount: 0, scoreMultiplier: 1 };
}

export function gainReputation(state: GameState, amount: number): number {
  return Math.max(0, state.reputation + Math.round(amount * state.scoreMultiplier));
}

// 転職直後は馴染み度が低いほど成果が下がる
export function familiarityFactor(state: GameState): number {
  return 0.6 + (clamp(state.familiarity) / 100) * 0.4; // 0.6〜1.0
}
