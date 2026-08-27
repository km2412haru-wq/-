"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CareerMeta, ChallengeFlags, GameState, RouteType } from "@/lib/types";
import { createInitialState, gameReducer, GameMsg, computeEndingType } from "@/lib/engine/engine";
import { DEFAULT_META, addXp, loadMeta, loadRanking, pushRanking, saveMeta } from "@/lib/storage";

import TitleScreen from "./screens/TitleScreen";
import SetupScreen from "./screens/SetupScreen";
import PlayScreen from "./screens/PlayScreen";
import AchievementsScreen from "./screens/AchievementsScreen";
import CodexScreen from "./screens/CodexScreen";
import RankingScreen from "./screens/RankingScreen";
import EndingScreen from "./screens/EndingScreen";

type Phase = "title" | "setup" | "game";
type PreGameScreen = "title" | "achievements" | "ranking" | "codex";

export default function Game() {
  const [phase, setPhase] = useState<Phase>("title");
  const [preGameScreen, setPreGameScreen] = useState<PreGameScreen>("title");
  const [meta, setMeta] = useState<CareerMeta>(DEFAULT_META);
  const [ranking, setRanking] = useState(loadRanking());
  const [state, setState] = useState<GameState | null>(null);
  const savedEndingRef = useRef(false);

  useEffect(() => {
    setMeta(loadMeta());
    setRanking(loadRanking());
  }, []);

  const send = (msg: GameMsg) => {
    setState((s) => (s ? gameReducer(s, msg) : s));
  };

  function startGame(route: RouteType, challenge: ChallengeFlags, ngPlusLevel: number) {
    savedEndingRef.current = false;
    setState(createInitialState(route, challenge, ngPlusLevel));
    setPhase("game");
  }

  // エンディングに到達したら一度だけ meta / ranking に反映する
  useEffect(() => {
    if (!state || !state.gameOver || savedEndingRef.current) return;
    savedEndingRef.current = true;
    const ending = computeEndingType(state);
    const nextMeta: CareerMeta = { ...meta };
    nextMeta.gamesPlayed += 1;
    nextMeta.gamesCleared += 1;
    nextMeta.bestReputation = Math.max(nextMeta.bestReputation, state.reputation);
    nextMeta.totalJobChangesEver += state.jobChangeCount;
    if (!nextMeta.routesCleared.includes(state.route)) nextMeta.routesCleared = [...nextMeta.routesCleared, state.route];
    const joined = [...state.jobHistory.map((j) => j.companyId), state.currentCompany.id];
    nextMeta.companiesEverJoined = Array.from(new Set([...nextMeta.companiesEverJoined, ...joined]));
    nextMeta.unlockedAchievementsGlobal = Array.from(new Set([...nextMeta.unlockedAchievementsGlobal, ...state.unlockedAchievements]));
    nextMeta.seenCompaniesGlobal = Array.from(new Set([...nextMeta.seenCompaniesGlobal, ...state.seenCompanies]));
    nextMeta.seenEventsGlobal = Array.from(new Set([...nextMeta.seenEventsGlobal, ...state.seenEvents]));
    if (ending.type === "fire") nextMeta.sawFireEnding = true;
    if (joined.includes("google")) nextMeta.sawGoogleOffer = true;

    const xpGain = 40 + state.unlockedAchievements.length * 15 + Math.round(state.reputation / 10);
    const leveled = addXp(nextMeta, xpGain);

    setMeta(leveled);
    saveMeta(leveled);

    pushRanking({
      date: new Date().toISOString().slice(0, 10),
      title: ending.title.replace(/^\S+\s/, ""),
      route: state.route,
      reputation: state.reputation,
      jobChangeCount: state.jobChangeCount,
      ending: ending.title,
      ngPlusLevel: state.ngPlusLevel,
    });
    setRanking(loadRanking());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const mergedUnlocked = useMemo(() => {
    const runUnlocked = state?.unlockedAchievements ?? [];
    return Array.from(new Set([...meta.unlockedAchievementsGlobal, ...runUnlocked]));
  }, [state, meta.unlockedAchievementsGlobal]);

  const mergedSeenCompanies = useMemo(() => Array.from(new Set([...meta.seenCompaniesGlobal, ...(state?.seenCompanies ?? [])])), [state, meta.seenCompaniesGlobal]);
  const mergedSeenEvents = useMemo(() => Array.from(new Set([...meta.seenEventsGlobal, ...(state?.seenEvents ?? [])])), [state, meta.seenEventsGlobal]);

  if (phase === "title") {
    if (preGameScreen === "achievements") return <AchievementsScreen unlocked={mergedUnlocked} onBack={() => setPreGameScreen("title")} />;
    if (preGameScreen === "codex") return <CodexScreen seenCompanies={mergedSeenCompanies} seenEvents={mergedSeenEvents} onBack={() => setPreGameScreen("title")} />;
    if (preGameScreen === "ranking") return <RankingScreen ranking={ranking} onBack={() => setPreGameScreen("title")} />;
    return (
      <TitleScreen
        meta={meta}
        onStart={() => setPhase("setup")}
        onAchievements={() => setPreGameScreen("achievements")}
        onCodex={() => setPreGameScreen("codex")}
        onRanking={() => setPreGameScreen("ranking")}
      />
    );
  }

  if (phase === "setup") {
    return <SetupScreen meta={meta} onBack={() => setPhase("title")} onStart={startGame} />;
  }

  if (!state) return null;

  if (state.screen === "achievements") {
    return <AchievementsScreen unlocked={mergedUnlocked} onBack={() => send({ type: "GOTO_SCREEN", screen: "play" })} />;
  }
  if (state.screen === "codex") {
    return <CodexScreen seenCompanies={mergedSeenCompanies} seenEvents={mergedSeenEvents} onBack={() => send({ type: "GOTO_SCREEN", screen: "play" })} />;
  }
  if (state.screen === "ranking") {
    return <RankingScreen ranking={ranking} onBack={() => send({ type: "GOTO_SCREEN", screen: "play" })} />;
  }
  if (state.screen === "ending") {
    return (
      <EndingScreen
        state={state}
        onTitle={() => {
          setPhase("title");
          setState(null);
        }}
        onRestart={() => startGame(state.route, { halfBudget: false, shortSprint: false, priceHike: false }, state.ngPlusLevel + 1)}
      />
    );
  }

  return <PlayScreen state={state} send={send} onNav={(screen) => send({ type: "GOTO_SCREEN", screen })} />;
}
