import { Company, CompanyAxes, CultureType, Tier } from "../types";

function clamp(n: number) {
  return Math.max(1, Math.min(100, Math.round(n)));
}

const TIER_BASE: Record<Tier, CompanyAxes> = {
  5: { salary: 90, discretion: 55, growth: 80, stability: 70, wlb: 45, techGrowth: 80, fame: 95 },
  4: { salary: 75, discretion: 55, growth: 70, stability: 80, wlb: 55, techGrowth: 65, fame: 80 },
  3: { salary: 60, discretion: 70, growth: 80, stability: 55, wlb: 55, techGrowth: 75, fame: 60 },
  2: { salary: 50, discretion: 50, growth: 60, stability: 80, wlb: 65, techGrowth: 45, fame: 40 },
  1: { salary: 40, discretion: 75, growth: 65, stability: 40, wlb: 55, techGrowth: 55, fame: 25 },
};

const STEP_TEMPLATES: Record<Tier, string[]> = {
  5: ["書類選考", "コーディングテスト", "技術面接①", "技術面接②", "最終面接"],
  4: ["書類選考", "適性検査", "技術面接", "最終面接"],
  3: ["カジュアル面談", "技術面接", "最終面接"],
  2: ["書類選考", "技術面接＋人物面接"],
  1: ["カジュアル面談"],
};

// 企業の業界タイプによって選考プロセスの中身を変える
// （同じ難易度でも、コンサルはケース面接、シンクタンクは論理思考テスト、
// 製造業は技術面接＋工場見学、金融は適性検査中心…と選考の雰囲気が違う）
const STEPS_CONSULTING_5 = ["書類選考", "ケース面接①", "ケース面接②", "パートナー面接", "最終面接"];
const STEPS_CONSULTING_4 = ["書類選考", "ケース面接", "グループディスカッション", "最終面接"];
const STEPS_MANUFACTURING_4 = ["書類選考", "技術面接", "工場見学・適性検査", "最終面接"];
const STEPS_THINKTANK_4 = ["書類選考", "論理思考テスト", "小論文", "面接"];
const STEPS_TOYOTA = ["書類選考", "技術面接", "事業理解・プレゼンテーション", "最終面接"];
const STEPS_MANUFACTURING_2 = ["書類選考", "技術面接＋工場見学"];
const STEPS_FINANCE_2 = ["適性検査", "人物面接＋最終面接"];

type Overrides = Partial<CompanyAxes>;

function axes(tier: Tier, o: Overrides = {}): CompanyAxes {
  const base = TIER_BASE[tier];
  return {
    salary: clamp(base.salary + (o.salary ?? 0)),
    discretion: clamp(base.discretion + (o.discretion ?? 0)),
    growth: clamp(base.growth + (o.growth ?? 0)),
    stability: clamp(base.stability + (o.stability ?? 0)),
    wlb: clamp(base.wlb + (o.wlb ?? 0)),
    techGrowth: clamp(base.techGrowth + (o.techGrowth ?? 0)),
    fame: clamp(base.fame + (o.fame ?? 0)),
  };
}

interface Def {
  id: string;
  name: string;
  emoji: string;
  tier: Tier;
  culture: CultureType;
  baseSalary: number;
  threshold: number;
  flavor: string;
  o?: Overrides;
  steps?: string[];
}

const DEFS: Def[] = [
  // ===== 難易度5：最難関 =====
  { id: "google", name: "Google", emoji: "🔍", tier: 5, culture: "foreign", baseSalary: 1400, threshold: 320, flavor: "検索とクラウド、そしてAIの巨人。狭き門。", o: { techGrowth: 10 } },
  { id: "meta", name: "Meta", emoji: "📘", tier: 5, culture: "foreign", baseSalary: 1400, threshold: 320, flavor: "SNSとAI研究を牽引するテックジャイアント。" },
  { id: "openai", name: "OpenAI", emoji: "🤖", tier: 5, culture: "foreign", baseSalary: 1500, threshold: 340, flavor: "生成AIの最前線。世界中から精鋭が集まる。", o: { techGrowth: 15, wlb: -10 } },
  { id: "anthropic", name: "Anthropic", emoji: "🧠", tier: 5, culture: "foreign", baseSalary: 1500, threshold: 340, flavor: "安全性を重視するAI研究企業。", o: { techGrowth: 15, wlb: -5 } },
  { id: "deepmind", name: "DeepMind", emoji: "🌀", tier: 5, culture: "foreign", baseSalary: 1400, threshold: 330, flavor: "基礎研究志向の強いAI研究機関。", o: { techGrowth: 15, discretion: 10 } },
  { id: "mckinsey", name: "マッキンゼー・アンド・カンパニー", emoji: "🧩", tier: 5, culture: "foreign", baseSalary: 1300, threshold: 300, flavor: "戦略コンサルの頂点。狭き門と激務で知られる。", o: { wlb: -20, discretion: -10, techGrowth: -15 }, steps: STEPS_CONSULTING_5 },
  { id: "bcg", name: "ボストン コンサルティング グループ", emoji: "📐", tier: 5, culture: "foreign", baseSalary: 1300, threshold: 300, flavor: "戦略コンサル大手。ケース面接の鬼門。", o: { wlb: -20, discretion: -10, techGrowth: -15 }, steps: STEPS_CONSULTING_5 },
  { id: "palantir", name: "Palantir Technologies", emoji: "🛰️", tier: 5, culture: "foreign", baseSalary: 1350, threshold: 310, flavor: "データ分析プラットフォームの雄。選考は硬派。" },

  // ===== 難易度4：難関 =====
  { id: "amazon", name: "Amazon", emoji: "📦", tier: 4, culture: "foreign", baseSalary: 1100, threshold: 190, flavor: "巨大ECとAWSを支えるカルチャーは高速。" },
  { id: "microsoft", name: "Microsoft", emoji: "🪟", tier: 4, culture: "foreign", baseSalary: 1100, threshold: 190, flavor: "クラウドとAIに投資するレガシー巨人。" },
  { id: "apple", name: "Apple", emoji: "🍎", tier: 4, culture: "foreign", baseSalary: 1100, threshold: 195, flavor: "秘密主義で知られるプロダクト志向企業。", o: { discretion: -5 } },
  { id: "nvidia", name: "NVIDIA", emoji: "🎮", tier: 4, culture: "foreign", baseSalary: 1200, threshold: 200, flavor: "AI計算基盤の心臓部。", o: { techGrowth: 15 } },
  { id: "netflix", name: "Netflix", emoji: "🎬", tier: 4, culture: "foreign", baseSalary: 1150, threshold: 195, flavor: "自由と責任の文化で知られる配信大手。", o: { discretion: 15 } },
  { id: "xai", name: "xAI", emoji: "🚀", tier: 4, culture: "foreign", baseSalary: 1150, threshold: 190, flavor: "急成長中の生成AIスタートアップ。", o: { wlb: -15, techGrowth: 10 } },
  { id: "cohere", name: "Cohere", emoji: "🔗", tier: 4, culture: "foreign", baseSalary: 1050, threshold: 175, flavor: "エンタープライズ向けLLM企業。", o: { techGrowth: 10 } },
  { id: "databricks", name: "Databricks", emoji: "🧱", tier: 4, culture: "foreign", baseSalary: 1100, threshold: 180, flavor: "データ＋AI基盤プラットフォーム。", o: { techGrowth: 10 } },
  { id: "snowflake", name: "Snowflake", emoji: "❄️", tier: 4, culture: "foreign", baseSalary: 1080, threshold: 175, flavor: "クラウドデータ基盤のリーダー。" },
  { id: "salesforce", name: "Salesforce", emoji: "☁️", tier: 4, culture: "foreign", baseSalary: 1050, threshold: 175, flavor: "SaaSの草分け、AIエージェントにも注力。" },
  { id: "accenture", name: "アクセンチュア", emoji: "💼", tier: 4, culture: "foreign", baseSalary: 950, threshold: 165, flavor: "総合コンサル最大手。案件は多種多様。", o: { wlb: -10 }, steps: STEPS_CONSULTING_4 },
  { id: "deloitte", name: "デロイト トーマツ コンサルティング", emoji: "📊", tier: 4, culture: "foreign", baseSalary: 950, threshold: 165, flavor: "Big4系コンサル。論理性を問われる。", o: { wlb: -10 }, steps: STEPS_CONSULTING_4 },
  { id: "pfn", name: "Preferred Networks", emoji: "🔬", tier: 4, culture: "japanese_mid", baseSalary: 1000, threshold: 185, flavor: "国内屈指のディープラーニング研究集団。", o: { techGrowth: 20, discretion: 10 } },
  { id: "keyence", name: "キーエンス", emoji: "⚙️", tier: 4, culture: "japanese_major", baseSalary: 1300, threshold: 195, flavor: "高収益・高年収で知られるセンサーメーカー。", o: { wlb: -10, stability: 10 }, steps: STEPS_MANUFACTURING_4 },
  { id: "fanuc", name: "ファナック", emoji: "🦾", tier: 4, culture: "japanese_major", baseSalary: 1050, threshold: 180, flavor: "産業用ロボットの巨人。堅実な社風。", o: { stability: 15 }, steps: STEPS_MANUFACTURING_4 },
  { id: "nri", name: "野村総合研究所（NRI）", emoji: "🏛️", tier: 4, culture: "japanese_major", baseSalary: 900, threshold: 170, flavor: "シンクタンク×ITコンサル。論理思考テストが鬼門。", o: { stability: 10 }, steps: STEPS_THINKTANK_4 },
  { id: "mri", name: "三菱総合研究所（MRI）", emoji: "🏯", tier: 4, culture: "japanese_major", baseSalary: 880, threshold: 168, flavor: "政策提言も手がけるシンクタンク。小論文重視。", o: { stability: 10 }, steps: STEPS_THINKTANK_4 },
  { id: "toyota", name: "トヨタ自動車", emoji: "🚗", tier: 4, culture: "japanese_major", baseSalary: 900, threshold: 175, flavor: "事業理解とプレゼン力も問われる製造業の巨人。", o: { stability: 15, techGrowth: -5 }, steps: STEPS_TOYOTA },

  // ===== 難易度3：中堅・人気企業 =====
  { id: "cyberagent", name: "サイバーエージェント", emoji: "📱", tier: 3, culture: "japanese_mid", baseSalary: 750, threshold: 95, flavor: "広告・ゲーム・AI事業を展開するメガベンチャー。" },
  { id: "dena", name: "DeNA", emoji: "🎲", tier: 3, culture: "japanese_mid", baseSalary: 750, threshold: 95, flavor: "ゲームからヘルスケアまで幅広く挑戦。" },
  { id: "mercari", name: "メルカリ", emoji: "🛍️", tier: 3, culture: "japanese_mid", baseSalary: 800, threshold: 100, flavor: "フリマアプリの雄、グローバル志向。", o: { discretion: 10 } },
  { id: "lineyahoo", name: "LINEヤフー", emoji: "💬", tier: 3, culture: "japanese_mid", baseSalary: 780, threshold: 98, flavor: "国内最大級のプラットフォーム企業。" },
  { id: "rakuten", name: "楽天グループ", emoji: "🛒", tier: 3, culture: "japanese_mid", baseSalary: 750, threshold: 95, flavor: "社内公用語は英語、グローバル展開中。" },
  { id: "sony", name: "ソニーグループ", emoji: "🎧", tier: 3, culture: "japanese_major", baseSalary: 800, threshold: 100, flavor: "エレクトロニクスからエンタメまで幅広い事業。" },
  { id: "hitachi", name: "日立製作所", emoji: "🏭", tier: 3, culture: "japanese_major", baseSalary: 750, threshold: 92, flavor: "社会インフラを支える総合電機。", o: { stability: 10 } },
  { id: "fujitsu", name: "富士通", emoji: "💻", tier: 3, culture: "japanese_major", baseSalary: 720, threshold: 90, flavor: "ITサービス大手、DX案件多数。", o: { stability: 10 } },
  { id: "softbank", name: "ソフトバンク", emoji: "📶", tier: 3, culture: "japanese_major", baseSalary: 780, threshold: 96, flavor: "通信とAI投資を両輪で進める。" },
  { id: "herozco", name: "HEROZ", emoji: "♟️", tier: 3, culture: "japanese_mid", baseSalary: 700, threshold: 88, flavor: "将棋AIから始まったAI専業企業。", o: { techGrowth: 15 } },
  { id: "elyza", name: "ELYZA", emoji: "🇯🇵", tier: 3, culture: "japanese_mid", baseSalary: 700, threshold: 85, flavor: "国産LLM開発を牽引するAIスタートアップ。", o: { techGrowth: 20, stability: -15 } },
  { id: "sakanaai", name: "Sakana AI", emoji: "🐟", tier: 3, culture: "japanese_mid", baseSalary: 750, threshold: 90, flavor: "進化的手法で注目される研究集団。", o: { techGrowth: 20, stability: -15 } },
  { id: "layerx", name: "LayerX", emoji: "🧾", tier: 3, culture: "japanese_mid", baseSalary: 720, threshold: 88, flavor: "AI・ブロックチェーン活用のバクラク運営。", o: { techGrowth: 15, discretion: 10 } },
  { id: "huggingface", name: "Hugging Face", emoji: "🤗", tier: 3, culture: "foreign", baseSalary: 850, threshold: 100, flavor: "OSSコミュニティの中心地。", o: { techGrowth: 20 } },
  { id: "scaleai", name: "Scale AI", emoji: "🏷️", tier: 3, culture: "foreign", baseSalary: 850, threshold: 98, flavor: "AI向けデータ基盤を提供。", o: { wlb: -10 } },
  { id: "stabilityai", name: "Stability AI", emoji: "🎨", tier: 3, culture: "foreign", baseSalary: 800, threshold: 95, flavor: "生成AIの画像分野を切り拓いた企業。", o: { techGrowth: 15, stability: -15 } },

  // ===== 難易度2：中間 =====
  { id: "tis", name: "TIS", emoji: "🖥️", tier: 2, culture: "japanese_major", baseSalary: 600, threshold: 45, flavor: "SIer大手、金融系案件が多い。" },
  { id: "scsk", name: "SCSK", emoji: "🖧", tier: 2, culture: "japanese_major", baseSalary: 600, threshold: 45, flavor: "働きやすさに定評のあるSIer。", o: { wlb: 10 } },
  { id: "panasonic", name: "パナソニック", emoji: "🔌", tier: 2, culture: "japanese_major", baseSalary: 620, threshold: 48, flavor: "総合家電・くらしのプラットフォーマー。", steps: STEPS_MANUFACTURING_2 },
  { id: "nec", name: "NEC", emoji: "🖨️", tier: 2, culture: "japanese_major", baseSalary: 620, threshold: 48, flavor: "顔認証AIなど社会インフラ寄りの技術に強い。", o: { techGrowth: 10 }, steps: STEPS_MANUFACTURING_2 },
  { id: "toshiba", name: "東芝", emoji: "🔋", tier: 2, culture: "japanese_major", baseSalary: 600, threshold: 46, flavor: "再建途上の老舗総合電機。", steps: STEPS_MANUFACTURING_2 },
  { id: "mitsubishielectric", name: "三菱電機", emoji: "🏗️", tier: 2, culture: "japanese_major", baseSalary: 630, threshold: 48, flavor: "重電からFAまで手がける総合電機。", steps: STEPS_MANUFACTURING_2 },
  { id: "kddi", name: "KDDI", emoji: "📡", tier: 2, culture: "japanese_major", baseSalary: 650, threshold: 50, flavor: "通信キャリア大手、新規事業にも積極的。" },
  { id: "freee", name: "freee", emoji: "🧮", tier: 2, culture: "japanese_mid", baseSalary: 620, threshold: 46, flavor: "スモールビジネスを支えるクラウド会計。", o: { discretion: 10 } },
  { id: "moneyforward", name: "マネーフォワード", emoji: "💰", tier: 2, culture: "japanese_mid", baseSalary: 620, threshold: 46, flavor: "家計簿・法人会計SaaSのリーダー。", o: { discretion: 10 } },
  { id: "smarthr", name: "SmartHR", emoji: "📋", tier: 2, culture: "japanese_mid", baseSalary: 630, threshold: 47, flavor: "人事労務SaaSで急成長。", o: { discretion: 10, growth: 10 } },
  { id: "cybozu", name: "サイボウズ", emoji: "🌐", tier: 2, culture: "japanese_mid", baseSalary: 610, threshold: 45, flavor: "複業採用や情報共有ツールで有名。", o: { wlb: 15 } },
  { id: "sansan", name: "Sansan", emoji: "🪪", tier: 2, culture: "japanese_mid", baseSalary: 630, threshold: 47, flavor: "名刺データを起点にした法人DB事業。" },
  { id: "abeja", name: "ABEJA", emoji: "🧪", tier: 2, culture: "japanese_mid", baseSalary: 620, threshold: 45, flavor: "AI導入支援に強みを持つ専業ベンチャー。", o: { techGrowth: 15 } },
  { id: "pkshatechnology", name: "PKSHA Technology", emoji: "🧠", tier: 2, culture: "japanese_mid", baseSalary: 630, threshold: 46, flavor: "アルゴリズム提供を軸にするAI企業。", o: { techGrowth: 15 } },
  { id: "sonysemi", name: "ソニーセミコンダクタソリューションズ", emoji: "📷", tier: 2, culture: "japanese_major", baseSalary: 650, threshold: 48, flavor: "イメージセンサー世界トップシェア。", steps: STEPS_MANUFACTURING_2 },
  { id: "renesas", name: "ルネサスエレクトロニクス", emoji: "🔧", tier: 2, culture: "japanese_major", baseSalary: 620, threshold: 46, flavor: "車載半導体に強い専業メーカー。", steps: STEPS_MANUFACTURING_2 },
  { id: "murata", name: "村田製作所", emoji: "🧲", tier: 2, culture: "japanese_major", baseSalary: 650, threshold: 48, flavor: "電子部品のグローバルリーダー。", o: { stability: 10 }, steps: STEPS_MANUFACTURING_2 },
  { id: "tdk", name: "TDK", emoji: "🧷", tier: 2, culture: "japanese_major", baseSalary: 630, threshold: 47, flavor: "電子部品・電池分野の大手。", steps: STEPS_MANUFACTURING_2 },
  { id: "nidec", name: "日本電産(ニデック)", emoji: "🌀", tier: 2, culture: "japanese_major", baseSalary: 640, threshold: 48, flavor: "モーターで世界を獲った精密機械メーカー。", steps: STEPS_MANUFACTURING_2 },
  { id: "omron", name: "オムロン", emoji: "🤖", tier: 2, culture: "japanese_major", baseSalary: 620, threshold: 46, flavor: "FA・ヘルスケア機器の大手。", steps: STEPS_MANUFACTURING_2 },
  { id: "nomurasec", name: "野村證券", emoji: "📈", tier: 2, culture: "japanese_major", baseSalary: 700, threshold: 50, flavor: "国内最大手の証券会社。", steps: STEPS_FINANCE_2 },
  { id: "mufg", name: "三菱UFJ銀行", emoji: "🏦", tier: 2, culture: "japanese_major", baseSalary: 680, threshold: 49, flavor: "国内最大のメガバンク。", o: { stability: 15, techGrowth: -10 }, steps: STEPS_FINANCE_2 },
  { id: "smbc", name: "三井住友銀行", emoji: "🏦", tier: 2, culture: "japanese_major", baseSalary: 680, threshold: 49, flavor: "メガバンクの一角、DXにも注力。", o: { stability: 15, techGrowth: -10 }, steps: STEPS_FINANCE_2 },
  { id: "mizuho", name: "みずほ銀行", emoji: "🏦", tier: 2, culture: "japanese_major", baseSalary: 660, threshold: 48, flavor: "システム統合を乗り越えたメガバンク。", o: { stability: 15, techGrowth: -10 }, steps: STEPS_FINANCE_2 },
  { id: "sbisec", name: "SBI証券", emoji: "💹", tier: 2, culture: "japanese_mid", baseSalary: 650, threshold: 47, flavor: "ネット証券最大手。", steps: STEPS_FINANCE_2 },
  { id: "monex", name: "マネックス証券", emoji: "📉", tier: 2, culture: "japanese_mid", baseSalary: 640, threshold: 46, flavor: "個人投資家向けネット証券。", steps: STEPS_FINANCE_2 },

  // ===== 難易度1：応募しやすい/積極採用中 =====
  { id: "aiinside", name: "AI inside", emoji: "📇", tier: 1, culture: "japanese_mid", baseSalary: 500, threshold: 15, flavor: "AI-OCRで知られる国産AI企業。" },
  { id: "laboroai", name: "Laboro.AI", emoji: "🧑‍🔬", tier: 1, culture: "japanese_mid", baseSalary: 490, threshold: 14, flavor: "AI導入コンサルティングに強み。" },
  { id: "spicefactory", name: "スパイスファクトリー", emoji: "🌶️", tier: 1, culture: "japanese_mid", baseSalary: 480, threshold: 13, flavor: "DX支援のブティックファーム。" },
  { id: "libconsulting", name: "リブ・コンサルティング", emoji: "🗣️", tier: 1, culture: "japanese_mid", baseSalary: 500, threshold: 15, flavor: "成長支援コンサル、現場密着型。" },
  { id: "turing", name: "Turing", emoji: "🚙", tier: 1, culture: "startup", baseSalary: 520, threshold: 16, flavor: "完全自動運転を目指すスタートアップ。", o: { techGrowth: 15, stability: -20 } },
  { id: "kaizenplatform", name: "Kaizen Platform", emoji: "📈", tier: 1, culture: "startup", baseSalary: 490, threshold: 14, flavor: "事業改善を支援するグロース企業。" },
  { id: "otsuka", name: "大塚商会", emoji: "🖇️", tier: 1, culture: "japanese_major", baseSalary: 550, threshold: 17, flavor: "IT商社の老舗、堅実な事業基盤。", o: { stability: 10 } },
  { id: "gmo", name: "GMOインターネットグループ", emoji: "🌐", tier: 1, culture: "japanese_mid", baseSalary: 510, threshold: 15, flavor: "インターネットインフラの総合企業。" },
  { id: "livesense", name: "リブセンス", emoji: "📰", tier: 1, culture: "japanese_mid", baseSalary: 490, threshold: 14, flavor: "成果報酬型メディア事業のパイオニア。" },
  { id: "visional", name: "ビズリーチ(Visional)", emoji: "🎯", tier: 1, culture: "japanese_mid", baseSalary: 530, threshold: 17, flavor: "転職プラットフォーム運営、採用強化中。" },
  { id: "uzabase", name: "ユーザベース", emoji: "📚", tier: 1, culture: "japanese_mid", baseSalary: 500, threshold: 15, flavor: "経済情報プラットフォームSPEEDA運営。" },
  { id: "mixi", name: "ミクシィ", emoji: "🎮", tier: 1, culture: "japanese_mid", baseSalary: 500, threshold: 15, flavor: "モンストで知られるエンタメ企業。" },
  { id: "gree", name: "グリー", emoji: "🕹️", tier: 1, culture: "japanese_mid", baseSalary: 500, threshold: 15, flavor: "ゲーム・メタバース事業を展開。" },
  { id: "gmofg", name: "GMOフィナンシャルゲート", emoji: "💳", tier: 1, culture: "japanese_mid", baseSalary: 490, threshold: 14, flavor: "決済インフラを支えるフィンテック企業。" },
];

export const COMPANIES: Company[] = DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  emoji: d.emoji,
  tier: d.tier,
  culture: d.culture,
  interviewSteps: d.steps ?? STEP_TEMPLATES[d.tier],
  axes: axes(d.tier, d.o),
  scoreThreshold: d.threshold,
  baseSalary: d.baseSalary,
  flavor: d.flavor,
}));

export const STARTING_COMPANY: Company = {
  id: "seed_startup",
  name: "シード期スタートアップ",
  emoji: "🌱",
  tier: 0 as Tier,
  culture: "startup",
  interviewSteps: [],
  axes: { salary: 30, discretion: 90, growth: 70, stability: 15, wlb: 35, techGrowth: 60, fame: 10 },
  scoreThreshold: 0,
  baseSalary: 350,
  flavor: "カオスだが裁量は大きい、キャリアの出発点。",
};

export function companyById(id: string): Company | undefined {
  if (id === STARTING_COMPANY.id) return STARTING_COMPANY;
  return COMPANIES.find((c) => c.id === id);
}

export function companiesByTier(tier: Tier): Company[] {
  return COMPANIES.filter((c) => c.tier === tier);
}
