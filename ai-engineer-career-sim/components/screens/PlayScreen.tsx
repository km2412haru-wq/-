"use client";

import { useState } from "react";
import { GameAction, GameState } from "@/lib/types";
import { GameMsg } from "@/lib/engine/engine";
import { ACTIONS } from "@/lib/data/actions";
import { titleForReputation, nextTitle } from "@/lib/data/titles";
import Gauge from "../ui/Gauge";
import InfoTip from "../ui/InfoTip";
import ScoreChart from "../ui/ScoreChart";
import EventModal from "../modals/EventModal";
import ScoutModal from "../modals/ScoutModal";
import InterviewModal from "../modals/InterviewModal";
import StayPromptModal from "../modals/StayPromptModal";
import ApplyModal from "../modals/ApplyModal";
import OfferCompareModal from "../modals/OfferCompareModal";

export default function PlayScreen({ state, send, onNav }: { state: GameState; send: (msg: GameMsg) => void; onNav: (screen: "achievements" | "codex" | "ranking") => void }) {
  const [choiceAction, setChoiceAction] = useState<GameAction | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showOffers, setShowOffers] = useState(false);

  const title = titleForReputation(state.reputation);
  const next = nextTitle(state.reputation);
  const blocked = !!(state.activeEvent || state.interview || state.pendingScout || state.stayPrompt);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 80px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {state.currentCompany.emoji} {state.currentCompany.name} ・ プロジェクト{state.projectIndex} ・ 第{state.week}週
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
            👑 {title.name}
            {next && (
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginLeft: 8 }}>
                次の称号まであと{next.threshold - state.reputation}
              </span>
            )}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Gauge label="予算" value={Math.max(0, state.budget)} max={state.budgetMax} color="var(--good)" emoji="💰" suffix="万円" />
        <Gauge label="残り納期" value={state.weeksLeft} max={state.projectTotalWeeks} color="var(--warn)" emoji="⏳" suffix="週" />
        <Gauge label="AP（今週の行動回数）" value={state.ap} max={state.apMax} color="var(--accent)" emoji="⚡" />
        <Gauge label="進捗" value={state.progress} max={100} color="#0891b2" emoji="📈" />
        <Gauge label="精度" value={state.quality} max={100} color="var(--accent)" emoji="🎯" />
        <Gauge label="満足度" value={state.satisfaction} max={100} color="var(--good)" emoji="😊" />
        <Gauge label="疲労度" value={state.fatigue} max={100} color="var(--bad)" emoji="🥱" />
        <Gauge label="トラブル発生率" value={state.riskLevel} max={100} color="var(--warn)" emoji="🎲" />
      </div>

      <div className="card" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          この2つの力が、転職の面接での「実力」になる
          <InfoTip text="面接はクイズではなく、ここまでのアクションで積み上げた技術力・コミュ力の数値でそのまま合否が決まる。数値が高いほど難しい企業にも通りやすくなる。" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Gauge label="技術力" value={state.techScore} max={170} color="var(--accent)" emoji="🔧" />
          <Gauge label="コミュ力" value={state.commScore} max={170} color="var(--good)" emoji="💬" />
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

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>今週のアクション</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8, marginBottom: 18 }}>
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            disabled={blocked || state.ap < a.apCost}
            onClick={() => (a.choices ? setChoiceAction(a) : send({ type: "DO_ACTION", actionId: a.id }))}
            className="card"
            style={{ textAlign: "left", padding: 12, cursor: "pointer", opacity: blocked || state.ap < a.apCost ? 0.5 : 1 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {a.emoji} {a.label}
              </div>
              <span className="tag" style={{ flex: "none" }}>
                AP{a.apCost}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5, display: "flex", gap: 4, alignItems: "flex-start" }}>
              <span>{a.tooltip}</span>
              {a.term && <InfoTip text={`【${a.term.name}】${a.term.desc}`} />}
            </div>
          </button>
        ))}
      </div>

      <button className="btn btn-primary btn-block" style={{ padding: 14, fontSize: 16, marginBottom: 22 }} disabled={blocked} onClick={() => send({ type: "END_WEEK" })}>
        週を終える →
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
                  <span>
                    <div style={{ fontWeight: 700 }}>{c.label}</div>
                    {c.tooltip && <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginTop: 2 }}>{c.tooltip}</div>}
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
