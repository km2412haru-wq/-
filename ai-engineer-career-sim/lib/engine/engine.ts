import {
  Achievement,
  AchievementCtx,
  ChallengeFlags,
  Company,
  GameEvent,
  GameState,
  InterviewQuestion,
  Offer,
  RouteType,
  Screen,
} from "../types";
import { COMPANIES, STARTING_COMPANY, companiesByTier } from "../data/companies";
import { ACTIONS, actionApply } from "../data/actions";
import { EVENTS } from "../data/events";
import { ACHIEVEMENTS } from "../data/achievements";
import { titleForReputation } from "../data/titles";
import { categoryForStep, pickQuestion } from "../data/interviewQuestions";
import { addLog, chance, clamp, gainReputation, rand } from "./helpers";

export type GameMsg =
  | { type: "DO_ACTION"; actionId: string; choiceId?: string }
  | { type: "END_WEEK" }
  | { type: "RESOLVE_EVENT"; choiceId: string }
  | { type: "APPLY_TO_COMPANY"; companyId: string }
  | { type: "OPEN_SCOUT_INTERVIEW" }
  | { type: "DISMISS_SCOUT" }
  | { type: "ANSWER_INTERVIEW"; optionId: string }
  | { type: "ACCEPT_OFFER"; offerId: string }
  | { type: "DECLINE_OFFER"; offerId: string }
  | { type: "RESOLVE_STAY"; stay: boolean }
  | { type: "RETIRE" }
  | { type: "GOTO_SCREEN"; screen: Screen };

const MAX_PROJECTS = 8;

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
  return {
    screen: "play",
    route,
    ngPlusLevel,
    challenge: { ...challenge, priceHike: ngPlusLevel >= 1 },
    week: 0,
    weeksLeft,
    projectTotalWeeks: weeksLeft,
    projectIndex: 1,
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
    log: [`🌱 ${STARTING_COMPANY.name}でのキャリアが始まった。${routeIntro}`],
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

// ============ プロジェクト終了判定 ============
function resolveProjectEnd(state: GameState): GameState {
  const success = state.quality >= 50 && state.progress >= 75;
  const partial = !success && (state.progress >= 45 || state.quality >= 40);
  const repGain = success ? 25 + Math.round(state.quality / 4) : partial ? 8 : 0;
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
      success
        ? `🎉 プロジェクト完了！高品質でリリースできた（精度${Math.round(state.quality)} / 進捗${Math.round(state.progress)}）。`
        : partial
        ? `📦 プロジェクトはなんとか形になった（精度${Math.round(state.quality)} / 進捗${Math.round(state.progress)}）。`
        : `💥 プロジェクトは納期に間に合わず、不完全な状態でリリースされた…。`
    ),
  };
  s = applyAchievements(s, { justEndedProject: true, projectSucceeded: success || partial });

  // 次のプロジェクトへ
  const nextWeeks = rand(8, 14);
  s = {
    ...s,
    projectIndex: s.projectIndex + 1,
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

// ============ 面接 ============
function buildQuestion(company: Company, stepIdx: number): InterviewQuestion {
  const stepName = company.interviewSteps[stepIdx] ?? "面接";
  const cat = categoryForStep(stepName);
  const q = pickQuestion(cat);
  const opts = [...q.options]
    .map((o, i) => ({ id: `opt${i}`, label: o.label, correct: o.correct }))
    .sort(() => Math.random() - 0.5);
  return { prompt: q.prompt, options: opts, note: q.note };
}

function startInterview(state: GameState, company: Company, origin: "scout" | "apply"): GameState {
  const startStep = origin === "scout" && company.interviewSteps.length > 1 ? 1 : 0;
  return {
    ...state,
    pendingScout: null,
    interview: {
      company,
      step: startStep,
      passedSteps: startStep,
      failed: false,
      question: buildQuestion(company, startStep),
    },
    interviewOrigin: origin,
    log: addLog(state, `📝 ${company.emoji} ${company.name} の選考「${company.interviewSteps[startStep] ?? "面接"}」が始まった。`),
  };
}

function resolveInterviewAnswer(state: GameState, optionId: string): GameState {
  if (!state.interview) return state;
  const iv = state.interview;
  const company = iv.company;
  const opt = iv.question.options.find((o) => o.id === optionId);
  const correct = !!opt?.correct;
  const statFactor = state.techScore / 220 + state.commScore / 220;
  const difficultyPenalty = company.tier * 0.07;
  const passProb = Math.max(0.06, Math.min(0.95, (correct ? 0.6 : 0.2) + statFactor - difficultyPenalty));
  const passed = chance(passProb);
  const noteLog = `${opt?.correct ? "✅" : "❌"} ${iv.question.note}`;

  if (!passed) {
    const s: GameState = {
      ...state,
      interview: null,
      interviewOrigin: null,
      appliedRecently: { ...state.appliedRecently, [company.id]: state.week },
      log: addLog(state, `😢 ${company.emoji} ${company.name} の選考は「${company.interviewSteps[iv.step]}」で不合格だった。${noteLog}`),
    };
    return s;
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
          ? `🎊🎉 最終選考通過！${company.emoji} ${company.name} から内定が届いた！！ ${noteLog}`
          : `🎉 ${company.emoji} ${company.name} から内定が届いた！ ${noteLog}`
      ),
    };
    s = applyAchievements(s, {});
    return s;
  }

  return {
    ...state,
    interview: { ...iv, step: nextStep, passedSteps: iv.passedSteps + 1, question: buildQuestion(company, nextStep) },
    log: addLog(state, `➡️ 「${company.interviewSteps[iv.step]}」通過！次は「${company.interviewSteps[nextStep]}」。${noteLog}`),
  };
}

// ============ 転職 ============
function performJobChange(state: GameState, offer: Offer): GameState {
  const weeksWorked = state.week;
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
    weeksLeft: rand(8, 14),
    projectTotalWeeks: state.projectTotalWeeks,
    ap: state.apMax,
    stayPrompt: null,
  };
  const cultureNote =
    offer.company.culture === "foreign"
      ? "外資系ならではの英語ミーティングやスピード感に慣れる必要がありそうだ。"
      : offer.company.culture === "japanese_major"
      ? "稟議や根回しなど、日系大手らしい進め方を覚える必要がありそうだ。"
      : "新しいチームのカルチャーに早く馴染みたい。";
  return { ...s, log: addLog(s, `🚪 ${offer.company.emoji} ${offer.company.name} へ転職した！${cultureNote}`) };
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

function endWeek(state: GameState): GameState {
  if (state.activeEvent || state.interview || state.pendingScout || state.stayPrompt || state.gameOver) return state;
  let s: GameState = {
    ...state,
    week: state.week + 1,
    weeksLeft: state.weeksLeft - 1,
    ap: state.apMax,
    fatigue: clamp(state.fatigue - 6),
    familiarity: clamp(state.familiarity + 15),
    riskLevel: state.fatigue > 80 ? clamp(state.riskLevel + 5, 0, 100) : state.riskLevel,
    studiedInARow: state.lastActionLabel === "study" ? state.studiedInARow : 0,
    lastActionLabel: null,
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
      let s: GameState = { ...result.state, activeEvent: null, log: addLog(result.state, `↳ ${result.log}`) };
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
    case "ANSWER_INTERVIEW": {
      let s = resolveInterviewAnswer(state, msg.optionId);
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
