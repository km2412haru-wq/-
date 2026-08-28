"use client";

import { useState } from "react";
import { GameAction, GameState } from "@/lib/types";
import { commuteMood, GameMsg, PHASE_LABEL, PHASE_ORDER, playerAge, RESIDENCE_LABEL } from "@/lib/engine/engine";
import { budgetMood, fatigueMood, projectWeather, riskMood } from "@/lib/engine/mood";
import { ACTIONS } from "@/lib/data/actions";
import { titleForReputation, nextTitle } from "@/lib/data/titles";
import Gauge from "../ui/Gauge";
import InfoTip from "../ui/InfoTip";
import EffectChips from "../ui/EffectChips";
import ScoreChart from "../ui/ScoreChart";
import EventModal from "../modals/EventModal";
import ScoutModal from "../modals/ScoutModal";
import InterviewModal from "../modals/InterviewModal";
import StayPromptModal from "../modals/StayPromptModal";
import ApplyModal from "../modals/ApplyModal";
import OfferCompareModal from "../modals/OfferCompareModal";
import BuyModal from "../modals/BuyModal";

export default function PlayScreen({ state, send, onNav }: { state: GameState; send: (msg: GameMsg) => void; onNav: (screen: "achievements" | "codex" | "ranking") => void }) {
  const [choiceAction, setChoiceAction] = useState<GameAction | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [showBuy, setShowBuy] = useState(false);

  const title = titleForReputation(state.reputation);
  const next = nextTitle(state.reputation);
  const blocked = !!(state.activeEvent || state.interview || state.pendingScout || state.stayPrompt);
  const weather = projectWeather(state);
  const comboBonusPercent = Math.round((state.scoreMultiplier - 1) * 100);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 80px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {state.currentCompany.emoji} {state.currentCompany.name} ・ {playerAge(state)}歳 ・ キャリア{state.week}ヶ月目
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
            👑 {title.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => onNav("achievements")}>
            🏅 実績
          </button>
          <button className="btn" onClick={() => onNav("codex")}>
            📖 図鑑
          </button>
          <button className="btn" onClick={() => onNav("ranking")}>
            🏆 ランキング
          </button>
          <button className="btn" onClick={() => send({ type: "RETIRE" })}>
            🚪 引退する
          </button>
        </div>
      </header>

      <div className="card" style={{ padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 34, lineHeight: 1 }}>{weather.emoji}</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>プロジェクトの調子：{weather.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{weather.advice}</div>
        </div>
        {state.comboCount >= 3 && (
          <div className="tag" style={{ background: "var(--warn-soft)", color: "var(--warn)", fontSize: 12 }}>
            🔥 {state.comboCount}連続成功中！評価+{comboBonusPercent}%ブースト
          </div>
        )}
      </div>

      <div className="card" style={{ padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>
            {state.currentMission.emoji} 今回の案件：{state.currentMission.title}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className="tag" style={{ background: "var(--good-soft)", color: "var(--good)" }}>
              🧑‍💼 {state.currentMission.roleTag}
            </span>
            <span className="tag">プロジェクト{state.projectIndex}</span>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 10px" }}>{state.currentMission.brief}</p>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {PHASE_ORDER.map((p, i) => {
              const currentIdx = PHASE_ORDER.indexOf(state.phase);
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={p} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: done ? "var(--good)" : active ? "var(--accent)" : "var(--gauge-track)",
                      marginBottom: 4,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: active ? 800 : 600,
                      color: active ? "var(--accent)" : done ? "var(--good)" : "var(--text-muted)",
                    }}
                  >
                    {PHASE_LABEL[p].emoji} {PHASE_LABEL[p].label}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 4 }}>
            <span>今は「{PHASE_LABEL[state.phase].label}」フェーズ：{PHASE_LABEL[state.phase].desc}</span>
            <InfoTip text="実際のAIエンジニアの業務工程になぞらえた4段階。進捗が伸びるほど自動的に次のフェーズへ進み、フェーズごとに使えるアクションが変わる（データ収集・分析→AIモデル開発→システムへの実装→運用・改善）。" />
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          <span className="tag" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            🎯 目標：精度{state.currentMission.successQuality}以上・進捗{state.currentMission.successProgress}以上でリリース成功
          </span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn)", marginBottom: 6 }}>{state.currentMission.bonusLabel}</div>
        <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 600 }}>
          🎯 このミッションに刺さるアクション：
          {state.currentMission.recommendedActionIds
            .map((id) => ACTIONS.find((a) => a.id === id))
            .filter((a): a is GameAction => !!a)
            .map((a) => `${a.emoji} ${a.label}`)
            .join(" / ")}
          （評価スコアの伸びが倍になる）
        </div>
      </div>

      <div className="card" style={{ padding: "14px 16px", marginBottom: 14, background: "var(--accent-soft)", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>⭐ 評価スコア：{state.reputation}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {next ? `次の称号「${next.name}」まであと${next.threshold - state.reputation}` : "最高称号に到達！"}
          </div>
        </div>
        <div className="gauge-track" style={{ marginBottom: 8 }}>
          <div
            className="gauge-fill"
            style={{
              width: `${next ? Math.min(100, ((state.reputation - title.threshold) / Math.max(1, next.threshold - title.threshold)) * 100) : 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          評価が高いほど、大きな会社からスカウトが届きやすくなり、称号もランクアップする。ほとんどの行動で少しずつ上がる（ログの「評価+◯」が目印）。
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Gauge
          label="予算（会社のお金）"
          value={Math.max(0, state.budget)}
          max={state.budgetMax}
          color="var(--good)"
          emoji="💰"
          suffix="万円"
          mood={budgetMood((Math.max(0, state.budget) / Math.max(1, state.budgetMax)) * 100)}
        />
        <Gauge label="残り納期" value={state.weeksLeft} max={state.projectTotalWeeks} color="var(--warn)" emoji="⏳" suffix="ヶ月" />
        <Gauge label="AP（この2ヶ月の行動回数）" value={state.ap} max={state.apMax} color="var(--accent)" emoji="⚡" />
        <Gauge label="進捗" value={state.progress} max={100} color="#0891b2" emoji="📈" />
        <Gauge label="精度" value={state.quality} max={100} color="var(--accent)" emoji="🎯" />
        <Gauge label="満足度" value={state.satisfaction} max={100} color="var(--good)" emoji="😊" />
        <Gauge label="疲労度" value={state.fatigue} max={100} color="var(--bad)" emoji="🥱" mood={fatigueMood(state.fatigue)} />
        <Gauge label="トラブル発生率" value={state.riskLevel} max={100} color="var(--warn)" emoji="🎲" mood={riskMood(state.riskLevel)} />
      </div>

      <div className="card" style={{ padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          🏡 プライベート
          <span className="tag">{state.boughtHouse ? "🏠 マイホーム" : RESIDENCE_LABEL[state.residence]}</span>
          {state.married && <span className="tag">💍 既婚</span>}
          {state.hasChild && <span className="tag">👶 子育て中</span>}
          {state.ownsCar && <span className="tag">🚗 マイカー</span>}
          {state.hasPet && <span className="tag">🐾 ペット</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
          {commuteMood(state).emoji} {state.currentCompany.name}への通勤：{commuteMood(state).label}
          <InfoTip text="勤務地は会社の業界で変わる（製造業は郊外の工場地帯になりやすい）。住まいのグレードを上げたり、郊外勤務なら車を持つと通勤の負担（疲労）が減る。マイホームがあれば通勤はほぼ気にならない。" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                🏦 個人貯金
                <InfoTip text="会社のプロジェクト予算とは別の、自分自身の貯金。給料から生活費・家賃を差し引いた分が2ヶ月ごとに積み上がっていく（住まいのグレードが上がるほど家賃も上がる）。マイナスになることもある。買い物や住み替え、マイホーム購入・結婚・出産の資金になったりする。" />
              </span>
              <span style={{ fontWeight: 700, color: state.personalSavings < 0 ? "var(--bad)" : "var(--text)" }}>{state.personalSavings}万円</span>
            </div>
            <div className="gauge-track">
              <div
                className="gauge-fill"
                style={{
                  width: `${Math.min(100, (Math.abs(state.personalSavings) / 300) * 100)}%`,
                  background: state.personalSavings < 0 ? "var(--bad)" : "var(--good)",
                }}
              />
            </div>
          </div>
          <Gauge
            label="モチベーション"
            value={state.motivation}
            max={100}
            color="#d946ef"
            emoji="🎨"
          />
        </div>
        <button
          className="btn"
          disabled={blocked}
          onClick={() => setShowBuy(true)}
          style={{ fontSize: 12.5 }}
        >
          🛍️ 貯金で買い物・住み替えをする
        </button>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.6 }}>
          モチベーションが高いほど疲労回復が良くなり、80以上を保つと評価スコアも少しずつ増える。放っておくと少しずつ下がる。貯金が貯まるとマイホーム購入・結婚・出産のイベントが訪れることも。資格は「資格勉強をする」アクションでコツコツ取得できる。
        </p>
      </div>

      <div className="card" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          この2つの力が、転職の面接での「実力」になる
          <InfoTip text="面接はクイズではなく、ここまでのアクションで積み上げた技術力・コミュ力の数値でそのまま合否が決まる。数値が高いほど難しい企業にも通りやすくなる。" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Gauge label="技術力" value={state.techScore} max={300} color="var(--accent)" emoji="🔧" />
          <Gauge label="コミュ力" value={state.commScore} max={300} color="var(--good)" emoji="💬" />
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <ScoreChart history={state.history} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => setShowApply(true)} disabled={blocked || state.ap < 1}>
          🏢 難関企業に応募する
        </button>
        <button className="btn" onClick={() => setShowOffers(true)} style={{ position: "relative" }}>
          📊 オファーを比較する
          {state.offers.length > 0 && (
            <span className="tag" style={{ position: "absolute", top: -8, right: -8, background: "var(--bad)", color: "#fff" }}>
              {state.offers.length}
            </span>
          )}
        </button>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        この2ヶ月のアクション
        <span className="tag" style={{ background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 700 }}>
          {PHASE_LABEL[state.phase].emoji} {PHASE_LABEL[state.phase].label}フェーズ
        </span>
        {ACTIONS.some((a) => a.roleTagRequired === state.currentMission.roleTag) && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--good)" }}>
            ✨ 今回は「{state.currentMission.roleTag}」専用アクションが使える
          </span>
        )}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8, marginBottom: 18 }}>
        {ACTIONS.filter(
          (a) =>
            (!a.roleTagRequired || a.roleTagRequired === state.currentMission.roleTag) &&
            (!a.phaseRequired || a.phaseRequired === state.phase)
        ).map((a) => {
          const isRecommended = state.currentMission.recommendedActionIds.includes(a.id);
          return (
          <button
            key={a.id}
            disabled={blocked || state.ap < a.apCost}
            onClick={() => (a.choices ? setChoiceAction(a) : send({ type: "DO_ACTION", actionId: a.id }))}
            className="card"
            style={{
              textAlign: "left",
              padding: 12,
              cursor: "pointer",
              opacity: blocked || state.ap < a.apCost ? 0.68 : 1,
              border: isRecommended
                ? "2px solid var(--accent)"
                : a.roleTagRequired
                ? "2px solid var(--good)"
                : a.phaseRequired
                ? "2px solid #0891b2"
                : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {a.emoji} {a.label}
              </div>
              <span className="tag" style={{ flex: "none" }}>
                AP{a.apCost}
              </span>
            </div>
            {a.roleTagRequired && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--good)", marginTop: 4 }}>✨ {a.roleTagRequired}専用アクション</div>
            )}
            {a.phaseRequired && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#0891b2", marginTop: 4 }}>
                {PHASE_LABEL[a.phaseRequired].emoji} {PHASE_LABEL[a.phaseRequired].label}フェーズの一手
              </div>
            )}
            {isRecommended && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent)", marginTop: 4 }}>🎯 このミッションに刺さる（評価2倍）</div>
            )}
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5, display: "flex", gap: 4, alignItems: "flex-start" }}>
              <span>{a.tooltip}</span>
              {a.term && <InfoTip text={`【${a.term.name}】${a.term.desc}`} />}
            </div>
            {a.when && (
              <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6, fontWeight: 600 }}>🕐 いつ：{a.when}</div>
            )}
            {a.effects ? (
              <div style={{ marginTop: 6 }}>
                <EffectChips effects={a.effects} />
              </div>
            ) : (
              a.choices && (
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 6 }}>👉 選択肢ごとに効果が異なる（クリックして確認）</div>
              )
            )}
          </button>
          );
        })}
      </div>

      <button className="btn btn-primary btn-block" style={{ padding: 14, fontSize: 16, marginBottom: 22 }} disabled={blocked} onClick={() => send({ type: "END_WEEK" })}>
        この2ヶ月を終える →
      </button>

      <div className="card" style={{ padding: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, margin: "0 0 8px", color: "var(--text-muted)" }}>ログ</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }} className="scrollbar-thin">
          {state.log.map((l, i) => (
            <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: i === 0 ? "var(--text)" : "var(--text-muted)" }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {choiceAction && (
        <div className="modal-overlay" onClick={() => setChoiceAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>
              {choiceAction.emoji} {choiceAction.label}
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>{choiceAction.tooltip}</p>
            <div style={{ display: "grid", gap: 8 }}>
              {choiceAction.choices!.map((c) => (
                <button
                  key={c.id}
                  className="btn btn-block"
                  style={{ justifyContent: "flex-start", padding: "12px 14px", textAlign: "left" }}
                  onClick={() => {
                    send({ type: "DO_ACTION", actionId: choiceAction.id, choiceId: c.id });
                    setChoiceAction(null);
                  }}
                >
                  <span style={{ display: "block" }}>
                    <div style={{ fontWeight: 700 }}>{c.label}</div>
                    {c.tooltip && <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginTop: 2 }}>{c.tooltip}</div>}
                    <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginTop: 6 }}>🕐 いつ：{c.when}</div>
                    <div style={{ marginTop: 6 }}>
                      <EffectChips effects={c.effects} />
                    </div>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showApply && (
        <ApplyModal
          state={state}
          onClose={() => setShowApply(false)}
          onApply={(companyId) => {
            send({ type: "APPLY_TO_COMPANY", companyId });
            setShowApply(false);
          }}
        />
      )}

      {showBuy && (
        <BuyModal
          state={state}
          onClose={() => setShowBuy(false)}
          onBuy={(itemId) => {
            send({ type: "SPEND_ON_HOBBY", itemId });
            setShowBuy(false);
          }}
          onMoveResidence={(to) => {
            send({ type: "MOVE_RESIDENCE", to });
          }}
        />
      )}

      {showOffers && (
        <OfferCompareModal
          state={state}
          onClose={() => setShowOffers(false)}
          onAccept={(offerId) => {
            send({ type: "ACCEPT_OFFER", offerId });
            setShowOffers(false);
          }}
          onDecline={(offerId) => send({ type: "DECLINE_OFFER", offerId })}
        />
      )}

      {state.activeEvent && <EventModal event={state.activeEvent.event} onChoose={(choiceId) => send({ type: "RESOLVE_EVENT", choiceId })} />}
      {state.pendingScout && (
        <ScoutModal company={state.pendingScout} onOpen={() => send({ type: "OPEN_SCOUT_INTERVIEW" })} onDismiss={() => send({ type: "DISMISS_SCOUT" })} />
      )}
      {state.interview && <InterviewModal state={state} onChallenge={() => send({ type: "CHALLENGE_INTERVIEW" })} />}
      {state.stayPrompt && <StayPromptModal offer={state.stayPrompt} onResolve={(stay) => send({ type: "RESOLVE_STAY", stay })} />}
    </div>
  );
}
