import { GameEvent } from "../types";
import { chance, clamp } from "../engine/helpers";

export const EVENTS: GameEvent[] = [
  {
    id: "api_cost_explosion",
    title: "本番でAPIコストが爆発した",
    emoji: "💸",
    description:
      "深夜、監視ダッシュボードのグラフが天井に張り付いている。想定外のリクエスト量でAPI課金が跳ね上がった。",
    weight: (s) => (s.modelChoice === "api" ? 3.5 : 1.2) * (s.challenge.priceHike ? 1.5 : 1),
    choices: [
      {
        id: "cache",
        label: "レート制限とキャッシュを急いで導入する",
        tooltip: "根本対応。多少の出費で以後の暴発を防ぐ。",
        apply: (s) => ({
          state: { ...s, budget: s.budget - 10, riskLevel: clamp(s.riskLevel - 8, 0, 100), quality: clamp(s.quality + 2) },
          log: "レート制限とキャッシュを導入した。以後の暴発リスクが下がった。",
        }),
      },
      {
        id: "watch",
        label: "とりあえず様子を見る",
        tooltip: "対応コストはゼロだが、被害はそのまま。",
        apply: (s) => ({
          state: { ...s, budget: s.budget - 40, satisfaction: clamp(s.satisfaction - 5), incidentEverHappened: true, incidentFreeProject: false },
          log: "様子を見ているうちに課金がさらに膨らんでしまった…。",
        }),
      },
      {
        id: "escalate",
        label: "上長に相談して緊急予算を確保する",
        tooltip: "気まずいが確実。信頼は少し削れる。",
        apply: (s) => ({
          state: { ...s, budget: s.budget + 10, satisfaction: clamp(s.satisfaction - 3), commScore: s.commScore + 1 },
          log: "上長に泣きついて緊急予算を確保した。少し気まずい空気が流れた。",
        }),
      },
    ],
  },
  {
    id: "hallucination",
    title: "ハルシネーションで誤情報を出した",
    emoji: "🌀",
    description: "AIがもっともらしい顔で事実と異なる回答を返し、ユーザーから指摘が入った。",
    weight: (s) => (s.quality < 55 ? 3 : 1),
    choices: [
      {
        id: "rag",
        label: "RAGを強化して再発防止する",
        tooltip: "外部知識で裏付けを取るようにし、根本的に精度を上げる。",
        apply: (s) => ({
          state: { ...s, quality: clamp(s.quality + 8), budget: s.budget - 15 },
          log: "RAGを強化した。以後の誤情報が大きく減りそうだ。",
        }),
      },
      {
        id: "apology",
        label: "ユーザーに謝罪し火消しする",
        tooltip: "その場はしのげるが満足度は下がる。",
        apply: (s) => ({
          state: { ...s, satisfaction: clamp(s.satisfaction - 10), budget: s.budget - 5, reputation: s.reputation + 1 },
          log: "丁寧に謝罪して火消しした。信頼はやや傷ついた。",
        }),
      },
      {
        id: "ignore",
        label: "静観する",
        tooltip: "コストはかからないが、リスクが積み上がる。",
        apply: (s) => ({
          state: {
            ...s,
            satisfaction: clamp(s.satisfaction - 15),
            riskLevel: clamp(s.riskLevel + 15, 0, 100),
            incidentEverHappened: true,
            incidentFreeProject: false,
          },
          log: "静観したが、SNSで少し話題になってしまった…。",
        }),
      },
    ],
  },
  {
    id: "competitor_release",
    title: "competitor社が似たプロダクトを先にリリースした",
    emoji: "🏁",
    description: "似たコンセプトのプロダクトが競合から先にローンチされたという知らせが届いた。",
    weight: () => 1.4,
    choices: [
      {
        id: "differentiate",
        label: "差別化ポイントを急いで追加する",
        tooltip: "進捗は犠牲になるが、独自性で勝負する。",
        apply: (s) => ({
          state: { ...s, progress: clamp(s.progress - 5, 0, 100), budget: s.budget - 15, quality: clamp(s.quality + 5) },
          log: "急いで差別化機能を追加した。方向性が明確になった。",
        }),
      },
      {
        id: "quality_race",
        label: "品質を磨き続けて長期戦に持ち込む",
        tooltip: "焦らず地力で勝負する。",
        apply: (s) => ({
          state: { ...s, satisfaction: clamp(s.satisfaction - 5), techScore: s.techScore + 3 },
          log: "焦らず品質を磨くことに決めた。チームの技術力が上がった。",
        }),
      },
      {
        id: "price",
        label: "価格訴求に切り替える",
        tooltip: "短期的な予算は助かるが、満足度がやや下がる。",
        apply: (s) => ({
          state: { ...s, budget: s.budget + 10, satisfaction: clamp(s.satisfaction - 8) },
          log: "価格訴求に舵を切った。予算には少し余裕ができた。",
        }),
      },
    ],
  },
  {
    id: "scope_change",
    title: "急な要件変更が来た",
    emoji: "📩",
    description: "「ちょっとここ、直せますよね？」PMからの一言が、計画をひっくり返そうとしている。",
    weight: (s) => (s.riskLevel > 50 ? 2.5 : 1.3),
    choices: [
      {
        id: "accept",
        label: "受け入れて対応する",
        tooltip: "関係は良好に保てるが進捗が犠牲になる。",
        apply: (s) => ({
          state: { ...s, progress: clamp(s.progress - 10, 0, 100), budget: s.budget - 10, commScore: s.commScore + 2 },
          log: "要件変更を受け入れて対応した。",
        }),
      },
      {
        id: "negotiate",
        label: "交渉してスコープを縮小する",
        tooltip: "コミュニケーション力が試されるバランス案。",
        apply: (s) => ({
          state: { ...s, commScore: s.commScore + 4, satisfaction: clamp(s.satisfaction - 3), progress: clamp(s.progress - 3, 0, 100) },
          log: "うまく交渉してスコープを縮小できた。",
        }),
      },
      {
        id: "refuse",
        label: "今回は断る",
        tooltip: "進捗は守れるが、関係がぎくしゃくする。",
        apply: (s) => ({
          state: { ...s, satisfaction: clamp(s.satisfaction - 10), riskLevel: clamp(s.riskLevel + 5, 0, 100) },
          log: "今回は断った。進捗は守れたが空気が少し悪くなった。",
        }),
      },
    ],
  },
  {
    id: "server_down",
    title: "サーバーが落ちた",
    emoji: "🔥",
    description: "アラートが鳴り止まない。本番環境が完全にダウンしている。",
    weight: (s) => (s.fatigue > 70 ? 3 : 1.2),
    choices: [
      {
        id: "midnight",
        label: "深夜対応で復旧させる",
        tooltip: "確実だが疲労が溜まる。",
        apply: (s) => ({
          state: { ...s, fatigue: clamp(s.fatigue + 20), budget: s.budget - 5, reputation: s.reputation + 3 },
          log: "深夜対応で復旧させた。チームからの信頼が上がった。",
        }),
      },
      {
        id: "automation",
        label: "自動復旧の仕組みを急いで作る",
        tooltip: "MLOps的な根本対応。コストはかかる。",
        apply: (s) => ({
          state: { ...s, budget: s.budget - 25, quality: clamp(s.quality + 3), riskLevel: clamp(s.riskLevel - 10, 0, 100) },
          log: "自動復旧の仕組みを整えた。同じ障害は起きにくくなった。",
        }),
      },
      {
        id: "morning",
        label: "翌朝まで放置する",
        tooltip: "楽だが、ユーザーの信頼が失われる。",
        apply: (s) => ({
          state: {
            ...s,
            satisfaction: clamp(s.satisfaction - 12),
            reputation: Math.max(0, s.reputation - 2),
            incidentEverHappened: true,
            incidentFreeProject: false,
          },
          log: "翌朝まで放置した。ユーザーの信頼が少し失われた。",
        }),
      },
    ],
  },
  {
    id: "praise_from_pm",
    title: "PMから高評価をもらった",
    emoji: "✨",
    description: "「今回のリリース、すごく良かったよ」珍しく前向きなフィードバックが届いた。",
    weight: (s) => (s.satisfaction > 65 ? 2 : 0.6),
    choices: [
      {
        id: "thanks",
        label: "ありがたく受け取る",
        apply: (s) => ({
          state: { ...s, satisfaction: clamp(s.satisfaction + 6), reputation: s.reputation + 4 },
          log: "素直に喜んだ。チームの士気も上がった。",
        }),
      },
    ],
  },
  {
    id: "teammate_burnout",
    title: "同僚が燃え尽きて離脱した",
    emoji: "😵",
    description: "無理を重ねていた同僚が、ついに休職することになった。しわ寄せがこちらに来る。",
    weight: (s) => (s.fatigue > 75 ? 2.2 : 0.8),
    choices: [
      {
        id: "cover",
        label: "業務をカバーする",
        tooltip: "自分の疲労が増えるが、チームは救われる。",
        apply: (s) => ({
          state: { ...s, fatigue: clamp(s.fatigue + 15), commScore: s.commScore + 3 },
          log: "業務をカバーした。大変だがチームの信頼は得られた。",
        }),
      },
      {
        id: "reduce_scope",
        label: "マネージャーに掛け合いスコープを削る",
        apply: (s) => ({
          state: { ...s, progress: clamp(s.progress - 5, 0, 100), commScore: s.commScore + 2 },
          log: "スコープを削ってもらい、チームの負荷を抑えた。",
        }),
      },
    ],
  },
  {
    id: "budget_review",
    title: "予算見直しの通達が来た",
    emoji: "📉",
    description: "経営会議の結果、プロジェクト予算の見直しを求められている。",
    weight: () => 1,
    choices: [
      {
        id: "accept_cut",
        label: "予算カットを受け入れる",
        apply: (s) => ({
          state: { ...s, budgetMax: Math.max(50, s.budgetMax - 20), commScore: s.commScore + 1 },
          log: "予算カットを受け入れた。やりくりが少し厳しくなる。",
        }),
      },
      {
        id: "defend",
        label: "成果を示して予算を死守する",
        tooltip: "コミュニケーション力と実績が試される。",
        apply: (s) => ({
          state: {
            ...s,
            budget: s.commScore > 15 ? s.budget + 10 : s.budget,
            satisfaction: s.commScore > 15 ? clamp(s.satisfaction + 3) : clamp(s.satisfaction - 3),
          },
          log: s.commScore > 15 ? "成果を示して予算を死守した！" : "説得を試みたが、あまり響かなかった…。",
        }),
      },
    ],
  },
  {
    id: "mentor_advice",
    title: "尊敬する先輩からアドバイスをもらえた",
    emoji: "🧑‍🏫",
    description: "ふらっと現れた先輩エンジニアが、的確な一言を残していった。",
    weight: () => 1,
    choices: [
      {
        id: "listen",
        label: "しっかり教えを乞う",
        apply: (s) => ({
          state: { ...s, techScore: s.techScore + 5, commScore: s.commScore + 3 },
          log: "先輩の言葉が刺さった。視野が広がった気がする。",
        }),
      },
    ],
  },
  {
    id: "viral_hit",
    title: "バズって一晩でユーザーが1万人増えた！",
    emoji: "🚀",
    description: "SNSで火がついたプロダクトが、一晩でとんでもない伸びを見せた。",
    weight: (s) => (s.satisfaction > 70 ? 0.12 : 0.03),
    hidden: true,
    choices: [
      {
        id: "ride",
        label: "この波に乗る",
        apply: (s) => ({
          state: {
            ...s,
            satisfaction: clamp(s.satisfaction + 20),
            reputation: s.reputation + 15,
            budget: s.budget + 30,
            riskLevel: clamp(s.riskLevel + 10, 0, 100),
            counters: { ...s.counters, viralHits: (s.counters.viralHits ?? 0) + 1 },
          },
          log: "バズの波に乗った！一気に注目度が上がったが、サーバー負荷が心配だ。",
        }),
      },
    ],
  },
  {
    id: "acquisition_offer",
    title: "有名企業から買収オファーが来た",
    emoji: "🏆",
    description: "プロダクトの評判を聞きつけた大企業から、非公式に買収の打診があった。",
    weight: (s) => (s.reputation > 150 ? 0.1 : 0.02),
    hidden: true,
    choices: [
      {
        id: "proud",
        label: "誇りを持って独立を続ける",
        apply: (s) => ({
          state: {
            ...s,
            reputation: s.reputation + 20,
            satisfaction: clamp(s.satisfaction + 8),
            counters: { ...s.counters, acquisitionOffers: (s.counters.acquisitionOffers ?? 0) + 1 },
          },
          log: "独立を貫くことにした。伝説として語り継がれそうな決断だ。",
        }),
      },
      {
        id: "listen_offer",
        label: "話だけ聞いてみる",
        apply: (s) => ({
          state: {
            ...s,
            salary: s.salary + 30,
            reputation: s.reputation + 10,
            counters: { ...s.counters, acquisitionOffers: (s.counters.acquisitionOffers ?? 0) + 1 },
          },
          log: "話を聞いてみた。今後の交渉材料としてキャリアに箔がついた。",
        }),
      },
    ],
  },

  // ===== 外資カルチャー限定イベント =====
  {
    id: "english_meeting",
    title: "全社ミーティングが全編英語だった",
    emoji: "🌍",
    description: "気づけば司会もQ&Aも全部英語。マイクが回ってきた瞬間、頭が真っ白になる。",
    weight: (s) => (s.currentCompany.culture === "foreign" ? 1.5 : 0),
    choices: [
      {
        id: "speak_up",
        label: "食らいついて発言する",
        apply: (s) => ({
          state: { ...s, commScore: s.commScore + 4, satisfaction: clamp(s.satisfaction - 3) },
          log: "たどたどしい英語ながらも発言した。度胸がついた。",
        }),
      },
      {
        id: "read_minutes",
        label: "議事録で後から追う",
        apply: (s) => ({
          state: { ...s, fatigue: clamp(s.fatigue - 3), commScore: s.commScore + 1 },
          log: "議事録で内容を後から確認した。無理はしなかった。",
        }),
      },
    ],
  },
  {
    id: "pip_event",
    title: "PIP（業績改善計画）の対象に指名されそうになった",
    emoji: "⚠️",
    description: "マネージャーとの1on1で、雲行きが怪しい話をされた。成果を示さなければまずい空気だ。",
    weight: (s) => (s.currentCompany.culture === "foreign" ? (s.satisfaction < 40 ? 2.2 : 0.3) : 0),
    choices: [
      {
        id: "turnaround",
        label: "圧倒的な成果で挽回する",
        tooltip: "リスクは高いが評価を覆すチャンス。",
        apply: (s) => ({
          state: { ...s, fatigue: clamp(s.fatigue + 15), reputation: s.reputation + 6, satisfaction: clamp(s.satisfaction + 10) },
          log: "死力を尽くして成果を出し、評価を覆した。",
        }),
      },
      {
        id: "quiet_search",
        label: "静かに次のキャリアを考え始める",
        apply: (s) => ({
          state: { ...s, satisfaction: clamp(s.satisfaction - 5) },
          log: "静かに身の振り方を考え始めた。",
        }),
      },
      {
        id: "honest_talk",
        label: "上司に率直に相談する",
        apply: (s) => ({
          state: { ...s, commScore: s.commScore + 3, satisfaction: clamp(s.satisfaction + 3) },
          log: "率直に相談したところ、状況を理解してもらえた。",
        }),
      },
    ],
  },

  // ===== 日系大手カルチャー限定イベント =====
  {
    id: "ringi_event",
    title: "重要な意思決定に『稟議書』が必要になった",
    emoji: "📜",
    description: "ちょっとした技術選定にも、正式な稟議が必要らしい。ハンコの数だけ時間が溶けていく。",
    weight: (s) => (s.currentCompany.culture === "japanese_major" ? 1.3 : 0),
    choices: [
      {
        id: "proper",
        label: "丁寧に稟議を通す",
        apply: (s) => ({
          state: { ...s, progress: clamp(s.progress - 4, 0, 100), commScore: s.commScore + 3, riskLevel: clamp(s.riskLevel - 5, 0, 100) },
          log: "時間はかかったが、丁寧に稟議を通した。関係部署の信頼を得た。",
        }),
      },
      {
        id: "pre_nego",
        label: "先に根回しをしておく",
        apply: (s) => ({
          state: { ...s, budget: s.budget - 5, commScore: s.commScore + 5, progress: clamp(s.progress - 1, 0, 100) },
          log: "事前に関係者へ話を通しておいたおかげで、スムーズに承認が下りた。",
        }),
      },
    ],
  },
  {
    id: "nemawashi_event",
    title: "会議前の『根回し』が事実上必須だった",
    emoji: "🤝",
    description: "会議本番でいきなり提案しても通らない。事前の空気づくりがものを言う世界のようだ。",
    weight: (s) => (s.currentCompany.culture === "japanese_major" ? 1.0 : 0),
    choices: [
      {
        id: "prepare",
        label: "各部署に事前説明して回る",
        apply: (s) => ({
          state: { ...s, fatigue: clamp(s.fatigue + 6), commScore: s.commScore + 4, riskLevel: clamp(s.riskLevel - 8, 0, 100) },
          log: "各部署への事前説明を済ませた。会議は驚くほどスムーズに進んだ。",
        }),
      },
      {
        id: "gamble",
        label: "本番の会議一発勝負に賭ける",
        apply: (s) => {
          const win = chance(0.4);
          return {
            state: { ...s, satisfaction: clamp(s.satisfaction + (win ? 8 : -10)) },
            log: win ? "一発勝負に勝った！会議で提案が通った。" : "根回し不足がたたり、会議で押し戻されてしまった…。",
          };
        },
      },
    ],
  },
];
