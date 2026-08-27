import { CareerMeta, RankingEntry } from "./types";

const META_KEY = "ai-career-sim:meta:v1";
const RANKING_KEY = "ai-career-sim:ranking:v1";

export const DEFAULT_META: CareerMeta = {
  gamesPlayed: 0,
  gamesCleared: 0,
  routesCleared: [],
  companiesEverJoined: [],
  bestReputation: 0,
  totalJobChangesEver: 0,
  playerLevel: 1,
  playerXp: 0,
  sawFireEnding: false,
  sawGoogleOffer: false,
  unlockedAchievementsGlobal: [],
  seenCompaniesGlobal: [],
  seenEventsGlobal: [],
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function loadMeta(): CareerMeta {
  if (typeof window === "undefined") return DEFAULT_META;
  try {
    return safeParse(window.localStorage.getItem(META_KEY), DEFAULT_META);
  } catch {
    return DEFAULT_META;
  }
}

export function saveMeta(meta: CareerMeta) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // localStorage無効環境では無視する
  }
}

export function loadRanking(): RankingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RANKING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushRanking(entry: RankingEntry) {
  if (typeof window === "undefined") return;
  try {
    const list = loadRanking();
    list.unshift(entry);
    list.sort((a, b) => b.reputation - a.reputation);
    window.localStorage.setItem(RANKING_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // ignore
  }
}

// XP・レベリング：実績解除やクリアで経験値を得る簡易システム
export function xpForNextLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

export function addXp(meta: CareerMeta, amount: number): CareerMeta {
  let xp = meta.playerXp + amount;
  let level = meta.playerLevel;
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level += 1;
  }
  return { ...meta, playerXp: xp, playerLevel: level };
}
