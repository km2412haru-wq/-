/**
 * 重み・閾値・最低成立人数などの調整値は、すべてこのファイルに集約する。
 * 戦の開始時にこの内容を Battles.META.configSnapshot へコピーし、戦の途中では変えない。
 */
export const HOUR_MS = 60 * 60 * 1000

export const gameConfig = {
  /** 信頼レベルごとの重み（票・通報） */
  trustWeight: { L0: 0.2, L1: 1.0, L2: 1.5 },

  /** 折りたたみ閾値（通報重みの合計）。仮置き */
  collapseThreshold: 3.0,
  /** 相手陣営からの通報に掛ける係数。仮置き */
  rivalReportFactor: 0.5,

  /** 最低成立人数。未達なら「投票のみの戦」に縮退。仮置き */
  minViability: { membersPerSide: 3, totalPosts: 10 },

  /** 各フェーズの長さ（時間）。検証用は phaseHoursOverride で短縮 */
  phase: { dayHours: 24, totalDays: 3, appealHours: 24 },

  limits: {
    postMaxChars: 300,
    postMaxNewlines: 5,
    appealReasonMaxChars: 300,
    appealExpectedMaxChars: 100,
    appealMaxPostRefs: 3,
    repVotesPerUser: 3,
    postCooldownSec: 60,
    postsPerUserPerDay: 30,
    pageSize: 50,
  },

  /** 貢献度の係数（Q-08） */
  contribution: { perPost: 1, perPersuasion: 5, perRepSelection: 10 },

  /** 日次LLM費用上限（USD、JST日付で集計）。仮置き */
  llmDailyBudgetUsd: 5,

  /** 用途別モデル名。設定で切替可能 */
  models: {
    theme: 'claude-sonnet-5-5',
    directive: 'claude-sonnet-5-5',
    judge: 'claude-opus-5-5',
  },
} as const

export type GameConfig = typeof gameConfig
export type TrustLevel = keyof typeof gameConfig.trustWeight
