import { GameAction, GameState } from "../types";
import { addLog, bumpCombo, chance, clamp, familiarityFactor, gainReputation, resetCombo } from "../engine/helpers";

function techBonus(s: GameState): number {
  return 1 + clamp(s.techScore, 0, 200) / 400; // techScore100で+25%程度
}

export const ACTIONS: GameAction[] = [
  {
    id: "requirements",
    label: "要件定義/PMとすり合わせる",
    emoji: "🗒️",
    apCost: 1,
    category: "planning",
    tooltip: "認識のズレを早めに解消し、後工程の手戻りリスクを減らす。地味だが最重要の一手。",
    when: "トラブルが心配な時、プロジェクトの序盤",
    effects: [
      { label: "進捗+3", tone: "good" },
      { label: "満足度+4", tone: "good" },
      { label: "トラブル発生率-8", tone: "good" },
      { label: "コミュ力+1", tone: "good" },
      { label: "評価+1", tone: "good" },
      { label: "疲労+3", tone: "bad" },
    ],
    term: { name: "手戻り", desc: "要件や認識のズレによって、後の工程をやり直すことになる状態。" },
    apply: (s) => {
      const fam = familiarityFactor(s);
      const progress = clamp(s.progress + Math.round(3 * fam), 0, 100);
      const satisfaction = clamp(s.satisfaction + 4);
      const riskLevel = clamp(s.riskLevel - 8, 0, 100);
      const combo = bumpCombo(s);
      return {
        state: {
          ...s,
          progress,
          satisfaction,
          riskLevel,
          commScore: s.commScore + 1,
          fatigue: clamp(s.fatigue + 3),
          reputation: gainReputation(s, 1),
          ...combo,
        },
        log: "PMと要件をすり合わせた。手戻りリスクが下がった。",
      };
    },
  },
  {
    id: "data_collect",
    label: "データ収集・前処理をする",
    emoji: "🗂️",
    apCost: 1,
    category: "data",
    tooltip: "モデルの土台となるデータを整える。「質」を取るか「量」を取るかのトレードオフ。",
    term: { name: "前処理", desc: "欠損値の除去や正規化など、機械学習で使える形にデータを整える作業。" },
    choices: [
      {
        id: "quality",
        label: "質を重視する（ラベルを丁寧に確認）",
        tooltip: "時間はかかるが質の高いデータになり、精度が伸びやすい。",
        when: "精度を伸ばしたい時、予算に余裕がある時",
        effects: [
          { label: "精度+6", tone: "good" },
          { label: "進捗+4", tone: "good" },
          { label: "トラブル発生率-2", tone: "good" },
          { label: "評価+1", tone: "good" },
          { label: "予算-15万円", tone: "bad" },
          { label: "疲労+4", tone: "bad" },
        ],
        apply: (s) => {
          const fam = familiarityFactor(s);
          const combo = bumpCombo(s);
          return {
            state: {
              ...s,
              progress: clamp(s.progress + Math.round(4 * fam), 0, 100),
              quality: clamp(s.quality + Math.round(6 * fam * techBonus(s))),
              budget: s.budget - 15,
              fatigue: clamp(s.fatigue + 4),
              riskLevel: clamp(s.riskLevel - 2, 0, 100),
              reputation: gainReputation(s, 1),
              ...combo,
            },
            log: "データを丁寧にクレンジングした。精度が上がった。",
          };
        },
      },
      {
        id: "quantity",
        label: "量を重視する（とにかくかき集める）",
        tooltip: "進捗は大きく進むが、ノイズが混じりやすくリスクが上がる。",
        when: "納期が迫っていて、とにかく進捗を稼ぎたい時",
        effects: [
          { label: "進捗+7", tone: "good" },
          { label: "精度+2", tone: "good" },
          { label: "評価+1", tone: "good" },
          { label: "予算-8万円", tone: "bad" },
          { label: "疲労+5", tone: "bad" },
          { label: "トラブル発生率+4", tone: "bad" },
        ],
        apply: (s) => {
          const fam = familiarityFactor(s);
          const combo = bumpCombo(s);
          return {
            state: {
              ...s,
              progress: clamp(s.progress + Math.round(7 * fam), 0, 100),
              quality: clamp(s.quality + Math.round(2 * fam)),
              budget: s.budget - 8,
              fatigue: clamp(s.fatigue + 5),
              riskLevel: clamp(s.riskLevel + 4, 0, 100),
              reputation: gainReputation(s, 1),
              ...combo,
            },
            log: "データを大量にかき集めた。進捗は進んだがノイズが心配だ。",
          };
        },
      },
    ],
  },
  {
    id: "model_select",
    label: "モデル選定をする",
    emoji: "🧬",
    apCost: 1,
    category: "model",
    tooltip: "自社学習・API利用・OSSファインチューニングから戦略を選ぶ。コストと自由度のトレードオフ。",
    term: { name: "ファインチューニング", desc: "既存の学習済みモデルを自社データで追加学習し、用途に合わせて調整する手法。" },
    choices: [
      {
        id: "inhouse",
        label: "自社学習する（高コスト・高い自由度）",
        tooltip: "コストと時間はかかるが、独自性と技術力が大きく伸びる。",
        when: "予算に余裕があり、技術力を大きく伸ばしたい時",
        effects: [
          { label: "技術力+6", tone: "good" },
          { label: "進捗+2", tone: "good" },
          { label: "評価+2", tone: "good" },
          { label: "予算-40万円", tone: "bad" },
        ],
        apply: (s) => ({
          state: {
            ...s,
            modelChoice: "inhouse",
            budget: s.budget - 40,
            techScore: s.techScore + 6,
            progress: clamp(s.progress + Math.round(2 * familiarityFactor(s)), 0, 100),
            reputation: gainReputation(s, 2),
            ...bumpCombo(s),
          },
          log: "自社学習モデルの構築に着手した。技術力が大きく伸びた。",
        }),
      },
      {
        id: "api",
        label: "API利用する（低コスト・素早い）",
        tooltip: "外部LLM APIを呼び出すだけで済むが、従量課金なのでコストが読みにくい。",
        when: "予算が少ない時、スピード重視で進めたい時",
        effects: [
          { label: "進捗+6", tone: "good" },
          { label: "評価+1", tone: "good" },
          { label: "予算-10万円", tone: "bad" },
          { label: "従量課金の事故リスクあり", tone: "bad" },
        ],
        apply: (s) => ({
          state: {
            ...s,
            modelChoice: "api",
            budget: s.budget - 10,
            progress: clamp(s.progress + Math.round(6 * familiarityFactor(s)), 0, 100),
            reputation: gainReputation(s, 1),
            ...bumpCombo(s),
          },
          log: "外部APIを組み込んだ。開発は速いが従量課金が少し心配だ。",
        }),
      },
      {
        id: "oss",
        label: "OSSをファインチューニングする（中コスト・中自由度）",
        tooltip: "オープンソースモデルを自社データで調整。バランス型。",
        when: "コストと自由度のバランスを取りたい時",
        effects: [
          { label: "技術力+3", tone: "good" },
          { label: "進捗+4", tone: "good" },
          { label: "評価+1", tone: "good" },
          { label: "予算-20万円", tone: "bad" },
        ],
        apply: (s) => ({
          state: {
            ...s,
            modelChoice: "oss",
            budget: s.budget - 20,
            techScore: s.techScore + 3,
            progress: clamp(s.progress + Math.round(4 * familiarityFactor(s)), 0, 100),
            reputation: gainReputation(s, 1),
            ...bumpCombo(s),
          },
          log: "OSSモデルをファインチューニングした。バランスの良い選択だ。",
        }),
      },
    ],
  },
  {
    id: "prototype",
    label: "プロトタイプを作る",
    emoji: "🛠️",
    apCost: 2,
    category: "build",
    tooltip: "手を動かして動くものを作る。工数を大きく消費する代わりに進捗が大きく進む。",
    when: "進捗を一気に進めたい時（APを2消費する重めの一手）",
    effects: [
      { label: "進捗+14", tone: "good" },
      { label: "精度+2", tone: "good" },
      { label: "評価+2", tone: "good" },
      { label: "予算-20万円", tone: "bad" },
      { label: "疲労+8", tone: "bad" },
    ],
    apply: (s) => {
      const fam = familiarityFactor(s);
      const combo = bumpCombo(s);
      return {
        state: {
          ...s,
          progress: clamp(s.progress + Math.round(14 * fam), 0, 100),
          quality: clamp(s.quality + 2),
          budget: s.budget - 20,
          fatigue: clamp(s.fatigue + 8),
          reputation: gainReputation(s, 2),
          ...combo,
        },
        log: "プロトタイプを組み上げた。動くものができると士気が上がる。",
      };
    },
  },
  {
    id: "prompt_rag",
    label: "プロンプトエンジニアリング/RAG構築をする",
    emoji: "📚",
    apCost: 1,
    category: "build",
    tooltip: "プロンプトの工夫や外部知識検索（RAG）で回答精度を底上げする。",
    term: { name: "RAG", desc: "Retrieval-Augmented Generation。外部知識を検索して回答に反映させることで、精度や最新性を上げる手法。" },
    when: "精度・満足度を伸ばしたい時",
    effects: [
      { label: "精度+7（プロンプト職は+10）", tone: "good" },
      { label: "進捗+3", tone: "good" },
      { label: "評価+1", tone: "good" },
      { label: "予算-5万円", tone: "bad" },
      { label: "疲労+3", tone: "bad" },
    ],
    apply: (s) => {
      const fam = familiarityFactor(s);
      const routeBonus = s.route === "prompt" ? 3 : 0;
      const combo = bumpCombo(s);
      return {
        state: {
          ...s,
          quality: clamp(s.quality + Math.round((7 + routeBonus) * fam * techBonus(s))),
          progress: clamp(s.progress + Math.round(3 * fam), 0, 100),
          budget: s.budget - 5,
          fatigue: clamp(s.fatigue + 3),
          reputation: gainReputation(s, 1),
          ...combo,
        },
        log: "プロンプトとRAGを調整した。回答の精度が上がった。",
      };
    },
  },
  {
    id: "evaluate_test",
    label: "評価・テストをする",
    emoji: "🧪",
    apCost: 1,
    category: "quality",
    tooltip: "モデルの弱点を洗い出す。早期にバグを発見できることもある。",
    term: { name: "評価指標", desc: "精度・再現率・F値など、モデルの性能を測る物差し。" },
    when: "トラブルを減らしたい時、本番リリース前",
    effects: [
      { label: "精度+5", tone: "good" },
      { label: "トラブル発生率-10", tone: "good" },
      { label: "評価+1（バグ発見時+3）", tone: "good" },
      { label: "疲労+3", tone: "bad" },
      { label: "30%でバグ発見（精度+3・予算-5万円）", tone: "neutral" },
    ],
    apply: (s) => {
      const fam = familiarityFactor(s);
      const foundBug = chance(0.3);
      const combo = bumpCombo(s);
      const base = clamp(s.quality + Math.round(5 * fam * techBonus(s)));
      return {
        state: {
          ...s,
          quality: foundBug ? clamp(base + 3) : base,
          riskLevel: clamp(s.riskLevel - 10, 0, 100),
          fatigue: clamp(s.fatigue + 3),
          budget: foundBug ? s.budget - 5 : s.budget,
          reputation: gainReputation(s, foundBug ? 3 : 1),
          counters: foundBug ? { ...s.counters, bugsCaught: (s.counters.bugsCaught ?? 0) + 1 } : s.counters,
          ...combo,
        },
        log: foundBug
          ? "テストで潜在バグを早期発見！修正コストはかかったが大事故を防げた。"
          : "評価・テストを実施した。弱点が見えてきた。",
      };
    },
  },
  {
    id: "code_review",
    label: "コードレビューを受ける",
    emoji: "🔍",
    apCost: 1,
    category: "quality",
    tooltip: "品質は上がるが、稀にレビューでバグが発覚し手戻りが発生する。",
    when: "品質と技術力の両方を伸ばしたい時",
    effects: [
      { label: "精度+4", tone: "good" },
      { label: "技術力+2", tone: "good" },
      { label: "評価+2", tone: "good" },
      { label: "疲労+2", tone: "bad" },
      { label: "22%でバグ発覚（進捗-3・予算-8万円・コンボ途切れ）", tone: "neutral" },
    ],
    apply: (s) => {
      const fam = familiarityFactor(s);
      const bugFound = chance(0.22);
      const combo = bugFound ? resetCombo() : bumpCombo(s);
      return {
        state: {
          ...s,
          quality: clamp(s.quality + Math.round((bugFound ? 6 : 4) * fam)),
          techScore: s.techScore + 2,
          progress: bugFound ? clamp(s.progress - 3, 0, 100) : s.progress,
          budget: bugFound ? s.budget - 8 : s.budget,
          fatigue: clamp(s.fatigue + 2),
          reputation: gainReputation(s, bugFound ? 1 : 2),
          incidentEverHappened: s.incidentEverHappened,
          counters: bugFound ? { ...s.counters, bugsCaught: (s.counters.bugsCaught ?? 0) + 1 } : s.counters,
          ...combo,
        },
        log: bugFound
          ? "レビューでバグが発覚…！手戻りが発生したが、本番前に潰せて良かった。"
          : "コードレビューを受けた。指摘を反映して品質が上がった。",
      };
    },
  },
  {
    id: "study",
    label: "技術記事/論文を読む",
    emoji: "📖",
    apCost: 1,
    category: "growth",
    tooltip: "知見を得ることで、以降のアクションの成功率や効果が有利になる。",
    term: { name: "知見の複利", desc: "学習の積み重ねによって、以降の意思決定の質が徐々に上がっていくこと。" },
    when: "面接に備えて技術力を伸ばしたい時、疲れを癒やしたい時",
    effects: [
      { label: "技術力+4", tone: "good" },
      { label: "評価+1", tone: "good" },
      { label: "疲労-2", tone: "good" },
    ],
    apply: (s) => ({
      state: {
        ...s,
        techScore: s.techScore + 4,
        articlesRead: s.articlesRead + 1,
        studiedInARow: s.studiedInARow + 1,
        fatigue: clamp(s.fatigue - 2),
        reputation: gainReputation(s, 1),
        ...bumpCombo(s),
      },
      log: "技術記事/論文を読み込んだ。次の一手が有利になりそうだ。",
    }),
  },
  {
    id: "consult_team",
    label: "チームに相談する",
    emoji: "🗣️",
    apCost: 1,
    category: "social",
    tooltip: "知恵を借りてリスクを減らす。ときどき思わぬヒントや小さな幸運が舞い込む。",
    when: "コミュ力を伸ばしたい時、トラブルを減らしたい時",
    effects: [
      { label: "コミュ力+3", tone: "good" },
      { label: "満足度+2", tone: "good" },
      { label: "評価+1", tone: "good" },
      { label: "トラブル発生率-5", tone: "good" },
      { label: "疲労-5", tone: "good" },
      { label: "25%で強運（予算+10万円・満足度+6・評価+2）", tone: "neutral" },
    ],
    apply: (s) => {
      const lucky = chance(0.25);
      return {
        state: {
          ...s,
          commScore: s.commScore + 3,
          riskLevel: clamp(s.riskLevel - 5, 0, 100),
          fatigue: clamp(s.fatigue - 5),
          budget: lucky ? s.budget + 10 : s.budget,
          satisfaction: clamp(s.satisfaction + (lucky ? 6 : 2)),
          reputation: gainReputation(s, lucky ? 2 : 1),
          counters: lucky ? { ...s.counters, luckyConsults: (s.counters.luckyConsults ?? 0) + 1 } : s.counters,
          ...bumpCombo(s),
        },
        log: lucky
          ? "チームに相談したら、思わぬヒントで小さな幸運が舞い込んだ！"
          : "チームに相談した。少し気が楽になった。",
      };
    },
  },
  {
    id: "rest",
    label: "休む/リフレッシュする",
    emoji: "☕",
    apCost: 1,
    category: "rest",
    tooltip: "疲労をためすぎると事故率（トラブル発生率）が上がる。適度な休息も戦略のうち。",
    when: "疲労が溜まってきた時",
    effects: [
      { label: "疲労-25", tone: "good" },
      { label: "満足度+2", tone: "good" },
      { label: "評価は上がらない", tone: "neutral" },
      { label: "連続成功コンボが途切れる", tone: "bad" },
    ],
    apply: (s) => ({
      state: {
        ...s,
        fatigue: clamp(s.fatigue - 25),
        satisfaction: clamp(s.satisfaction + 2),
        ...resetCombo(),
      },
      log: "しっかり休んだ。頭がすっきりした。",
    }),
  },
];

// 評価スコア（reputation）がどれだけ増えたかをログに一緒に表示し、
// 「何をすると評価が上がるのか」をその場でわかるようにする
function withReputationDelta(before: GameState, after: GameState, message: string): string {
  const delta = after.reputation - before.reputation;
  return delta > 0 ? `${message}（評価+${delta}）` : message;
}

// 今の案件（ミッション）が推奨するアクションを選ぶと、評価スコアの伸びが倍になる。
// 「どれを押しても同じ」ではなく、案件ごとに最適な一手が変わるようにする仕掛け。
function withMissionSynergy(before: GameState, after: GameState, actionId: string, message: string): { state: GameState; log: string } {
  const isRecommended = before.currentMission.recommendedActionIds.includes(actionId);
  const baseDelta = after.reputation - before.reputation;
  if (!isRecommended || baseDelta <= 0) return { state: after, log: message };
  return {
    state: { ...after, reputation: after.reputation + baseDelta, counters: { ...after.counters, missionSynergyHits: (after.counters.missionSynergyHits ?? 0) + 1 } },
    log: `${message} 🎯このミッションに刺さる一手で評価が倍増！`,
  };
}

export function actionApply(
  action: GameAction,
  choiceId: string | undefined,
  s: GameState
): { state: GameState; log: string } {
  const raw = action.choices ? (action.choices.find((c) => c.id === choiceId) ?? action.choices[0]).apply(s) : action.apply!(s);
  const synergized = withMissionSynergy(s, raw.state, action.id, raw.log);
  const log = withReputationDelta(s, synergized.state, synergized.log);
  return { state: { ...synergized.state, log: addLog(synergized.state, `${action.emoji} ${log}`) }, log };
}
