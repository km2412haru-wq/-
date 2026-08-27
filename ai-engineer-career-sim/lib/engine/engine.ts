import {
  Achievement,
  AchievementCtx,
  ChallengeFlags,
  Company,
  GameEvent,
  GameState,
  Offer,
  RouteType,
  Screen,
  StepFocus,
} from "../types";
import { COMPANIES, STARTING_COMPANY, companiesByTier } from "../data/companies";
import { ACTIONS, actionApply } from "../data/actions";
import { EVENTS } from "../data/events";
import { ACHIEVEMENTS } from "../data/achievements";
import { titleForReputation } from "../data/titles";
import { focusForStep, pickFlavor } from "../data/interviewFlavor";
import { pickMission } from "../data/missions";
import { addLog, chance, clamp, gainReputation, rand } from "./helpers";

export type GameMsg =
  | { type: "DO_ACTION"; actionId: string; choiceId?: string }
  | { type: "END_WEEK" }
  | { type: "RESOLVE_EVENT"; choiceId: string }
  | { type: "APPLY_TO_COMPANY"; companyId: string }
  | { type: "OPEN_SCOUT_INTERVIEW" }
  | { type: "DISMISS_SCOUT" }
  | { type: "CHALLENGE_INTERVIEW" }
  | { type: "ACCEPT_OFFER"; offerId: string }
  | { type: "DECLINE_OFFER"; offerId: string }
  | { type: "RESOLVE_STAY"; stay: boolean }
  | { type: "SPEND_ON_HOBBY" }
  | { type: "RETIRE" }
  | { type: "GOTO_SCREEN"; screen: Screen };

export const HOBBY_COST = 15; // 万円

const MAX_PROJECTS = 8;

// ============ 選考の合否判定（クイズではなく実力の数値で決める） ============
const TIER_BASE_THRESHOLD: Record<number, number> = { 1: 12, 2: 30, 3: 55, 4: 85, 5: 125 };

// このステップで問われる力を重視して「実力スコア」を算出する
export function interviewPower(state: GameState, focus: StepFocus): number {
  const { techScore, commScore, reputation } = state;
  const base =
    focus === "tech" ? techScore * 1.3 + commScore * 0.4 : focus === "comm" ? commScore * 1.3 + techScore * 0.4 : techScore * 0.85 + commScore * 0.85;
  return base + reputation * 0.12;
}

export function stepThreshold(company: Company, stepIdx: number): number {
  return (TIER_BASE_THRESHOLD[company.tier] ?? 30) + stepIdx * 10;
}

export function estimatePassChance(state: GameState, company: Company, stepIdx: number): number {
  const focus = focusForStep(company.interviewSteps[stepIdx] ?? "");
  const power = interviewPower(state, focus);
  const threshold = stepThreshold(company, stepIdx);
  return Math.max(0.06, Math.min(0.95, 0.5 + (power - threshold) / 50));
}

export function passChanceLabel(p: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (p >= 0.75) return { label: "余裕の手応え", tone: "good" };
  if (p >= 0.55) return { label: "良い手応え", tone: "good" };
  if (p >= 0.4) return { label: "五分五分", tone: "warn" };
  if (p >= 0.2) return { label: "ちょっと厳しい", tone: "warn" };
  return { label: "かなり厳しい", tone: "bad" };
}

export function createInitialState(route: RouteType, challenge: ChallengeFlags, ngPlusLevel: number): GameState {
  const budgetMax = Math.round((challenge.halfBudget ? 260 : 520) * (1 - Math.min(0.4, 0.08 * ngPlusLevel)));
  const apMax = route === "mlops" ? 4 : 3;
  const weeksLeft = challenge.shortSprint ? 1 : 12;
  const routeIntro =
    route === "ml"
      ? "MLエンジニアとしてモデルの中身にとことんこだわっていく。"
      : route === "prompt"
      ? "プロンプトエンジニアとして言葉の力でAIを操る。"
      : "MLOpsエンジニアとして安定稼働と自動化にこだわる。";
  const { mission, usedIds } = pickMission([], STARTING_COMPANY.culture);
  return {
    screen: "play",
    route,
    ngPlusLevel,
    challenge: { ...challenge, priceHike: ngPlusLevel >= 1 },
    week: 0,
    weeksLeft,
    projectTotalWeeks: weeksLeft,
    projectIndex: 1,
    currentMission: mission,
    usedMissionIds: usedIds,
    budget: budgetMax,
    budgetMax,
    ap: apMax,
    apMax,
    progress: 0,
    quality: route === "ml" ? 15 : 10,
    satisfaction: 50,
    techScore: route === "ml" ? 10 : 0,
    commScore: route === "prompt" ? 5 : 0,
    fatigue: 10,
    reputation: Math.round(ngPlusLevel * 15),
    comboCount: 0,
    scoreMultiplier: 1,
    salary: STARTING_COMPANY.baseSalary,
    personalSavings: 30,
    motivation: 50,
    hobbySpentThisWeek: false,
    boughtHouse: false,
    married: false,
    currentCompany: STARTING_COMPANY,
    familiarity: 100,
    jobHistory: [],
    jobChangeCount: 0,
    offers: [],
    pendingScout: null,
    interview: null,
    interviewOrigin: null,
    appliedRecently: {},
    stayPrompt: null,
    activeEvent: null,
    log: [
      `${mission.emoji} 最初の案件は「${mission.title}」。${mission.brief}`,
      `🌱 ${STARTING_COMPANY.name}でのキャリアが始まった。${routeIntro}`,
    ],
    history: [{ week: 0, quality: route === "ml" ? 15 : 10, satisfaction: 50, reputation: 0 }],
    unlockedAchievements: [],
    seenCompanies: [],
    seenEvents: [],
    titlesReached: [titleForReputation(0).name],
    riskLevel: 20,
    incidentFreeProject: true,
    incidentEverHappened: false,
    budgetExactlyZeroed: false,
    studiedInARow: 0,
    articlesRead: 0,
    modelChoice: null,
    dataChoiceHistory: [],
    gameOver: false,
    endingType: null,
    totalProjectsCompleted: 0,
    totalProjectsFailed: 0,
    lastActionLabel: null,
    counters: {},
  };
}

// ============ 実績判定 ============
function applyAchievements(state: GameState, ctx: AchievementCtx): GameState {
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (state.unlockedAchievements.includes(a.id)) continue;
    if (a.check(state, ctx)) newly.push(a.id);
  }
  if (newly.length === 0) return state;
  let log = state.log;
  for (const id of newly) {
    const a = ACHIEVEMENTS.find((x) => x.id === id) as Achievement;
    log = [`🏅 実績解除：「${a.name}」— ${a.desc}`, ...log];
  }
  return { ...state, unlockedAchievements: [...state.unlockedAchievements, ...newly], log: log.slice(0, 40) };
}

function pushHistory(state: GameState): GameState {
  return {
    ...state,
    history: [...state.history, { week: state.week, quality: state.quality, satisfaction: state.satisfaction, reputation: state.reputation }].slice(-60),
  };
}

function trackTitle(state: GameState): GameState {
  const t = titleForReputation(state.reputation);
  if (state.titlesReached.includes(t.name)) return state;
  return { ...state, titlesReached: [...state.titlesReached, t.name], log: addLog(state, `👑 称号が「${t.name}」になった！`) };
}

// ============ イベント抽選 ============
function rollEvent(state: GameState): GameEvent | null {
  if (!chance(0.42)) return null;
  const pool = EVENTS.map((e) => ({ e, w: e.weight(state) })).filter((x) => x.w > 0);
  const total = pool.reduce((a, x) => a + x.w, 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const { e, w } of pool) {
    r -= w;
    if (r <= 0) return e;
  }
  return pool[pool.length - 1].e;
}

// ============ プロジェクト終了判定（案件＝ミッションごとに成功条件が変わる） ============
function resolveProjectEnd(state: GameState): GameState {
  const mission = state.currentMission;
  const success = state.quality >= mission.successQuality && state.progress >= mission.successProgress;
  const partial = !success && (state.progress >= mission.successProgress * 0.6 || state.quality >= mission.successQuality * 0.8);
  const bonusHit = (success || partial) && mission.bonusCheck(state);
  const repGain = (success ? 25 + Math.round(state.quality / 4) : partial ? 8 : 0) + (bonusHit ? mission.bonusReputation : 0);
  let s: GameState = {
    ...state,
    reputation: gainReputation(state, repGain),
    totalProjectsCompleted: state.totalProjectsCompleted + (success || partial ? 1 : 0),
    totalProjectsFailed: state.totalProjectsFailed + (success || partial ? 0 : 1),
    budgetExactlyZeroed: state.budgetExactlyZeroed || state.budget <= 0,
  };
  s = {
    ...s,
    log: addLog(
      s,
      `${mission.emoji} ${success ? mission.flavorSuccess : partial ? mission.flavorPartial : mission.flavorFail}（精度${Math.round(state.quality)} / 進捗${Math.round(
        state.progress
      )}）`
    ),
  };
  if (bonusHit) {
    s = { ...s, log: addLog(s, `✨ ${mission.bonusLabel.replace("🎁 ", "")}を達成した！`) };
  }
  s = applyAchievements(s, { justEndedProject: true, projectSucceeded: success || partial });

  // 次のプロジェクト（新しい案件）へ
  const nextWeeks = rand(8, 14);
  const { mission: nextMission, usedIds } = pickMission(s.usedMissionIds, s.currentCompany.culture);
  s = {
    ...s,
    projectIndex: s.projectIndex + 1,
    currentMission: nextMission,
    usedMissionIds: usedIds,
    weeksLeft: nextWeeks,
    projectTotalWeeks: nextWeeks,
    progress: 0,
    quality: clamp(Math.round(state.quality * 0.25)),
    satisfaction: clamp(Math.round(state.satisfaction * 0.7 + 15)),
    riskLevel: 20,
    budget: s.budgetMax,
    incidentFreeProject: true,
    modelChoice: null,
    ap: s.apMax,
    log: addLog(s, `${nextMission.emoji} 次の案件は「${nextMission.title}」。${nextMission.brief}`),
  };
  s = { ...s, incidentFreeProject: true };

  if (s.projectIndex > MAX_PROJECTS) {
    return endGame(s);
  }
  return s;
}

// ============ スカウト抽選 ============
function rollScout(state: GameState): GameState {
  if (state.pendingScout || state.interview || state.activeEvent || state.stayPrompt) return state;
  if (state.offers.length >= 4) return state; // オファーを抱えすぎている
  const candidates = COMPANIES.filter((c) => {
    if (state.appliedRecently[c.id] !== undefined && state.week - state.appliedRecently[c.id] < 6) return false;
    if (state.currentCompany.id === c.id) return false;
    if (state.offers.some((o) => o.company.id === c.id)) return false;
    return true;
  });
  const weighted = candidates
    .map((c) => {
      const gap = state.reputation - c.scoreThreshold;
      let w: number;
      if (c.tier === 5) {
        w = gap > 0 ? 0.15 : 0.01; // 応募しない限り滅多に来ない
      } else if (gap >= 0) {
        w = 1.2 + gap / 40;
      } else if (gap > -c.scoreThreshold * 0.4) {
        w = 0.25;
      } else {
        w = 0;
      }
      return { c, w };
    })
    .filter((x) => x.w > 0);
  const total = weighted.reduce((a, x) => a + x.w, 0);
  if (total <= 0) return state;
  if (!chance(0.16)) return state;
  let r = Math.random() * total;
  let chosen: Company | null = null;
  for (const { c, w } of weighted) {
    r -= w;
    if (r <= 0) {
      chosen = c;
      break;
    }
  }
  if (!chosen) chosen = weighted[weighted.length - 1].c;
  return {
    ...state,
    pendingScout: chosen,
    seenCompanies: state.seenCompanies.includes(chosen.id) ? state.seenCompanies : [...state.seenCompanies, chosen.id],
    log: addLog(state, `📨 ${chosen.emoji} ${chosen.name} からスカウトが届いた！`),
  };
}

// ============ 面接（クイズではなく、育てた「実力」の数値で合否が決まる） ============
function startInterview(state: GameState, company: Company, origin: "scout" | "apply"): GameState {
  const startStep = origin === "scout" && company.interviewSteps.length > 1 ? 1 : 0;
  const focus = focusForStep(company.interviewSteps[startStep] ?? "面接");
  return {
    ...state,
    pendingScout: null,
    interview: {
      company,
      step: startStep,
      passedSteps: startStep,
      failed: false,
      focus,
      flavor: pickFlavor(focus),
    },
    interviewOrigin: origin,
    log: addLog(state, `📝 ${company.emoji} ${company.name} の選考「${company.interviewSteps[startStep] ?? "面接"}」が始まった。`),
  };
}

function resolveInterviewChallenge(state: GameState): GameState {
  if (!state.interview) return state;
  const iv = state.interview;
  const company = iv.company;
  const passProb = estimatePassChance(state, company, iv.step);
  const passed = chance(passProb);
  const scoreLog = `（実力スコア${Math.round(interviewPower(state, iv.focus))} / 目安${stepThreshold(company, iv.step)}）`;

  if (!passed) {
    return {
      ...state,
      interview: null,
      interviewOrigin: null,
      appliedRecently: { ...state.appliedRecently, [company.id]: state.week },
      log: addLog(state, `😢 ${company.emoji} ${company.name} の選考は「${company.interviewSteps[iv.step]}」で不合格だった${scoreLog}。`),
    };
  }

  const nextStep = iv.step + 1;
  if (nextStep >= company.interviewSteps.length) {
    // 内定！
    const jitter = () => rand(-6, 8);
    const rolledAxes = {
      salary: clamp(company.axes.salary + jitter(), 1, 100),
      discretion: clamp(company.axes.discretion + jitter(), 1, 100),
      growth: clamp(company.axes.growth + jitter(), 1, 100),
      stability: clamp(company.axes.stability + jitter(), 1, 100),
      wlb: clamp(company.axes.wlb + jitter(), 1, 100),
      techGrowth: clamp(company.axes.techGrowth + jitter(), 1, 100),
      fame: clamp(company.axes.fame + jitter(), 1, 100),
    };
    const rolledSalary = Math.round(company.baseSalary * (1 + Math.min(0.6, state.reputation / 1200)) * (1 + rand(-5, 8) / 100));
    const offer: Offer = { offerId: `${company.id}-${state.week}-${Math.random().toString(36).slice(2, 7)}`, company, rolledAxes, rolledSalary, receivedWeek: state.week };
    const fanfare = company.tier === 5;
    let s: GameState = {
      ...state,
      interview: null,
      interviewOrigin: null,
      offers: [...state.offers, offer],
      appliedRecently: { ...state.appliedRecently, [company.id]: state.week },
      log: addLog(
        state,
        fanfare
          ? `🎊🎉 最終選考通過！${company.emoji} ${company.name} から内定が届いた！！${scoreLog}`
          : `🎉 ${company.emoji} ${company.name} から内定が届いた！${scoreLog}`
      ),
    };
    s = applyAchievements(s, {});
    return s;
  }

  const nextFocus = focusForStep(company.interviewSteps[nextStep] ?? "面接");
  return {
    ...state,
    interview: { ...iv, step: nextStep, passedSteps: iv.passedSteps + 1, focus: nextFocus, flavor: pickFlavor(nextFocus) },
    log: addLog(state, `➡️ 「${company.interviewSteps[iv.step]}」通過！次は「${company.interviewSteps[nextStep]}」${scoreLog}。`),
  };
}

// ============ 転職 ============
function performJobChange(state: GameState, offer: Offer): GameState {
  const weeksWorked = state.week;
  const nextWeeks = rand(8, 14);
  const { mission: nextMission, usedIds } = pickMission(state.usedMissionIds, offer.company.culture);
  const s: GameState = {
    ...state,
    jobHistory: [
      ...state.jobHistory,
      { companyId: state.currentCompany.id, name: state.currentCompany.name, emoji: state.currentCompany.emoji, weeksWorked, culture: state.currentCompany.culture },
    ],
    currentCompany: offer.company,
    salary: offer.rolledSalary,
    familiarity: 25,
    jobChangeCount: state.jobChangeCount + 1,
    offers: state.offers.filter((o) => o.offerId !== offer.offerId),
    budgetMax: Math.round(state.budgetMax * (0.9 + offer.company.tier * 0.05)),
    budget: Math.round(state.budgetMax * (0.9 + offer.company.tier * 0.05)),
    progress: 0,
    riskLevel: 25,
    projectIndex: 1,
    currentMission: nextMission,
    usedMissionIds: usedIds,
    weeksLeft: nextWeeks,
    projectTotalWeeks: nextWeeks,
    ap: state.apMax,
    stayPrompt: null,
  };
  const cultureNote =
    offer.company.culture === "foreign"
      ? "外資系ならではの英語ミーティングやスピード感に慣れる必要がありそうだ。"
      : offer.company.culture === "japanese_major"
      ? "稟議や根回しなど、日系大手らしい進め方を覚える必要がありそうだ。"
      : "新しいチームのカルチャーに早く馴染みたい。";
  let s2: GameState = { ...s, log: addLog(s, `🚪 ${offer.company.emoji} ${offer.company.name} へ転職した！${cultureNote}`) };
  s2 = { ...s2, log: addLog(s2, `${nextMission.emoji} 新天地での最初の案件は「${nextMission.title}」。${nextMission.brief}`) };
  return s2;
}

// ============ エンディング ============
export function computeEndingType(state: GameState): { type: string; title: string; desc: string } {
  if (state.totalProjectsFailed >= 4 || (state.satisfaction < 15 && state.quality < 25)) {
    return { type: "fire", title: "🔥 炎上エンド", desc: "たび重なるプロジェクト炎上の末、キャリアは大きく揺らいだ。しかしこの経験もまた糧になる。" };
  }
  if (state.reputation >= 900) {
    return { type: "legendary", title: "👑 伝説のCTOエンド", desc: "AI業界にその名を轟かせる存在となった。駆け出しの日々が嘘のようだ。" };
  }
  if (state.jobChangeCount === 0) {
    return { type: "company_man", title: "🏠 一社忠誠エンド", desc: "一つの会社に骨を埋める覚悟で勤め上げた。信頼という名の資産を築いた。" };
  }
  if (state.jobChangeCount >= 3) {
    return { type: "globe_trotter", title: "🧳 渡り鳥エンジニアエンド", desc: "何度もキャリアを乗り換え、多様な現場を渡り歩いた百戦錬磨のエンジニアになった。" };
  }
  if (state.currentCompany.tier >= 4) {
    return { type: "big_corp", title: "🏢 大企業エンジニアエンド", desc: "狭き門をくぐり抜け、名だたる企業でキャリアを築いている。" };
  }
  return { type: "steady", title: "🌤️ 堅実キャリアエンド", desc: "派手さはなくとも、着実にキャリアを積み上げてきた。これからも道は続く。" };
}

function endGame(state: GameState): GameState {
  const ending = computeEndingType(state);
  let s: GameState = { ...state, gameOver: true, endingType: ending.type, screen: "ending" };
  s = applyAchievements(s, { justSawEnding: ending.type });
  return { ...s, log: addLog(s, `🏁 ${ending.title}`) };
}

// ============ 週の締め処理 ============
function settleAfterEvent(state: GameState): GameState {
  let s = state;
  if (s.weeksLeft <= 0 && !s.gameOver) {
    s = resolveProjectEnd(s);
  }
  if (!s.gameOver) {
    s = rollScout(s);
  }
  s = trackTitle(s);
  return s;
}

const WEEKLY_LIVING_COST = 8; // 万円。家賃・食費などの生活費（給料から毎週差し引かれる）

function endWeek(state: GameState): GameState {
  if (state.activeEvent || state.interview || state.pendingScout || state.stayPrompt || state.gameOver) return state;
  const weeklyIncome = Math.round(state.salary / 52);
  // 趣味でプライベートが充実しているほど疲れにくい。マイホームがあると生活が安定し、さらに回復しやすい
  const fatigueRecovery = 6 + Math.round(state.motivation / 25) + (state.boughtHouse ? 2 : 0);
  let s: GameState = {
    ...state,
    week: state.week + 1,
    weeksLeft: state.weeksLeft - 1,
    ap: state.apMax,
    fatigue: clamp(state.fatigue - fatigueRecovery),
    familiarity: clamp(state.familiarity + 15),
    riskLevel: state.fatigue > 80 ? clamp(state.riskLevel + 5, 0, 100) : state.riskLevel,
    studiedInARow: state.lastActionLabel === "study" ? state.studiedInARow : 0,
    lastActionLabel: null,
    personalSavings: state.personalSavings + weeklyIncome - WEEKLY_LIVING_COST,
    motivation: clamp(state.motivation - 2),
    hobbySpentThisWeek: false,
    reputation: state.motivation >= 80 ? gainReputation(state, 1) : state.reputation,
  };
  s = pushHistory(s);
  const ev = rollEvent(s);
  if (ev) {
    return {
      ...s,
      activeEvent: { event: ev },
      seenEvents: s.seenEvents.includes(ev.id) ? s.seenEvents : [...s.seenEvents, ev.id],
      log: addLog(s, `${ev.emoji} ${ev.title}`),
    };
  }
  return settleAfterEvent(s);
}

export function gameReducer(state: GameState, msg: GameMsg): GameState {
  switch (msg.type) {
    case "DO_ACTION": {
      if (state.activeEvent || state.interview || state.pendingScout || state.stayPrompt || state.gameOver) return state;
      const action = ACTIONS.find((a) => a.id === msg.actionId);
      if (!action) return state;
      if (state.ap < action.apCost) return { ...state, log: addLog(state, "⚠️ APが足りない。") };
      const { state: applied } = actionApply(action, msg.choiceId, state);
      let s: GameState = { ...applied, ap: state.ap - action.apCost, lastActionLabel: action.id, dataChoiceHistory: state.dataChoiceHistory };
      if (action.id === "data_collect" && msg.choiceId) {
        s = { ...s, dataChoiceHistory: [...state.dataChoiceHistory, msg.choiceId as "quality" | "quantity"] };
      }
      s = applyAchievements(s, {});
      return s;
    }
    case "END_WEEK":
      return endWeek(state);
    case "RESOLVE_EVENT": {
      if (!state.activeEvent) return state;
      const choice = state.activeEvent.event.choices.find((c) => c.id === msg.choiceId) ?? state.activeEvent.event.choices[0];
      const result = choice.apply(state);
      const repDelta = result.state.reputation - state.reputation;
      const logLine = repDelta > 0 ? `↳ ${result.log}（評価+${repDelta}）` : `↳ ${result.log}`;
      let s: GameState = { ...result.state, activeEvent: null, log: addLog(result.state, logLine) };
      s = applyAchievements(s, {});
      s = settleAfterEvent(s);
      return s;
    }
    case "APPLY_TO_COMPANY": {
      if (state.activeEvent || state.interview || state.pendingScout || state.stayPrompt || state.gameOver) return state;
      if (state.ap < 1) return { ...state, log: addLog(state, "⚠️ APが足りない。") };
      const company = COMPANIES.find((c) => c.id === msg.companyId);
      if (!company) return state;
      if (state.appliedRecently[company.id] !== undefined && state.week - state.appliedRecently[company.id] < 6) {
        return { ...state, log: addLog(state, `⏳ ${company.name} には少し間を置いてから応募しよう。`) };
      }
      const s = startInterview({ ...state, ap: state.ap - 1 }, company, "apply");
      return { ...s, seenCompanies: s.seenCompanies.includes(company.id) ? s.seenCompanies : [...s.seenCompanies, company.id] };
    }
    case "OPEN_SCOUT_INTERVIEW": {
      if (!state.pendingScout) return state;
      return startInterview(state, state.pendingScout, "scout");
    }
    case "DISMISS_SCOUT": {
      if (!state.pendingScout) return state;
      return { ...state, pendingScout: null, log: addLog(state, `🙅 ${state.pendingScout.name} のスカウトは今回見送った。`) };
    }
    case "CHALLENGE_INTERVIEW": {
      let s = resolveInterviewChallenge(state);
      s = applyAchievements(s, {});
      return s;
    }
    case "ACCEPT_OFFER": {
      const offer = state.offers.find((o) => o.offerId === msg.offerId);
      if (!offer) return state;
      const isFirstJob = state.jobChangeCount === 0 && state.currentCompany.id === STARTING_COMPANY.id;
      if (!isFirstJob && chance(0.3)) {
        return { ...state, stayPrompt: offer, log: addLog(state, "🤝 引き止めにあった。このまま転職するか、残るか…。") };
      }
      let s = performJobChange(state, offer);
      s = applyAchievements(s, { justJoinedCompanyId: offer.company.id });
      return s;
    }
    case "DECLINE_OFFER": {
      const offer = state.offers.find((o) => o.offerId === msg.offerId);
      if (!offer) return state;
      return { ...state, offers: state.offers.filter((o) => o.offerId !== msg.offerId), log: addLog(state, `📭 ${offer.company.name} のオファーを辞退した。`) };
    }
    case "RESOLVE_STAY": {
      if (!state.stayPrompt) return state;
      const offer = state.stayPrompt;
      if (msg.stay) {
        const s: GameState = {
          ...state,
          stayPrompt: null,
          offers: state.offers.filter((o) => o.offerId !== offer.offerId),
          salary: Math.round(state.salary * 1.15),
          satisfaction: clamp(state.satisfaction + 10),
          log: addLog(state, `🙏 引き止められて現職に残ることにした。給与が少し上がった。`),
        };
        return s;
      }
      let s = performJobChange({ ...state, stayPrompt: null }, offer);
      s = applyAchievements(s, { justJoinedCompanyId: offer.company.id });
      return s;
    }
    case "SPEND_ON_HOBBY": {
      if (state.activeEvent || state.interview || state.pendingScout || state.stayPrompt || state.gameOver) return state;
      if (state.hobbySpentThisWeek) return { ...state, log: addLog(state, "⏳ 趣味に使えるのは週1回まで。") };
      if (state.personalSavings < HOBBY_COST) return { ...state, log: addLog(state, "⚠️ 貯金が足りない。") };
      let s: GameState = {
        ...state,
        personalSavings: state.personalSavings - HOBBY_COST,
        motivation: clamp(state.motivation + 10),
        hobbySpentThisWeek: true,
        log: addLog(state, "🎨 貯金を趣味に使ってリフレッシュした。モチベーションが上がった。"),
      };
      s = applyAchievements(s, {});
      return s;
    }
    case "RETIRE": {
      if (state.activeEvent || state.interview || state.pendingScout || state.stayPrompt || state.gameOver) return state;
      return endGame(state);
    }
    case "GOTO_SCREEN":
      return { ...state, screen: msg.screen };
    default:
      return state;
  }
}

export function availableApplyTargets(state: GameState): Company[] {
  return COMPANIES.filter((c) => !(state.appliedRecently[c.id] !== undefined && state.week - state.appliedRecently[c.id] < 6));
}

export function tierCompanies(tier: 1 | 2 | 3 | 4 | 5) {
  return companiesByTier(tier);
}

export { ACTIONS };
