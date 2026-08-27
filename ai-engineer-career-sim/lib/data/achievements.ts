import { Achievement } from "../types";

const STARTING_SALARY = 350;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_project", name: "はじめての納品", desc: "初めてプロジェクトを完了する", check: (s, c) => !!c.justEndedProject && !!c.projectSucceeded },
  { id: "clean_record", name: "無事故キャリア", desc: "一度も本番障害を起こさずクリアする", check: (s, c) => !!c.justSawEnding && !s.incidentEverHappened },
  { id: "penny_pincher", name: "使い切り職人", desc: "予算を1円も余らせず使い切る", check: (s, c) => !!c.justEndedProject && s.budget <= 0 },
  { id: "fire_ending", name: "灰の中から", desc: "炎上エンドを見る", hidden: true, check: (s, c) => c.justSawEnding === "fire" },
  { id: "job_hopper", name: "渡り鳥エンジニア", desc: "3社渡り歩いてキャリアアップする", check: (s) => s.jobHistory.length >= 3 },
  { id: "company_man", name: "一社勤め上げ", desc: "一度も転職せず勤め上げる", check: (s, c) => !!c.justSawEnding && s.jobChangeCount === 0 },
  { id: "google_dream", name: "検索の巨人へ", desc: "Google内定を獲得する", check: (s) => s.jobHistory.some((j) => j.companyId === "google") || s.currentCompany.id === "google" },
  { id: "triple_salary", name: "年収3倍プレイヤー", desc: "年収を初期の3倍にする", check: (s) => s.salary >= STARTING_SALARY * 3 },
  { id: "combo_10", name: "ノリに乗ってる", desc: "10連続コンボを達成する", check: (s) => s.comboCount >= 10 },
  { id: "combo_20", name: "ゾーンに入った", desc: "20連続コンボを達成する", hidden: true, check: (s) => s.comboCount >= 20 },
  { id: "bookworm", name: "知の探求者", desc: "技術記事/論文を合計10本読む", check: (s) => s.articlesRead >= 10 },
  { id: "study_streak", name: "インプット中毒", desc: "5ヶ月連続で技術記事/論文を読む", check: (s) => s.studiedInARow >= 5 },
  { id: "legendary_cto", name: "伝説の称号", desc: "「伝説のCTO」の称号に到達する", check: (s) => s.reputation >= 800 },
  { id: "hall_of_fame", name: "生き字引", desc: "「AI業界の生き字引」の称号に到達する", hidden: true, check: (s) => s.reputation >= 1200 },
  { id: "ng_plus_challenger", name: "もう一周", desc: "2周目（NG+）に挑戦する", check: (s) => s.ngPlusLevel >= 1 },
  { id: "ng_plus_master", name: "周回の果てに", desc: "NG+3周目以降をクリアする", hidden: true, check: (s, c) => !!c.justSawEnding && s.ngPlusLevel >= 3 },
  { id: "half_budget_clear", name: "極貧クリア", desc: "予算半分縛りでクリアする", check: (s, c) => !!c.justSawEnding && s.challenge.halfBudget },
  { id: "short_sprint_clear", name: "電光石火", desc: "短納期チャレンジをクリアする", check: (s, c) => !!c.justSawEnding && s.challenge.shortSprint },
  { id: "tier5_offer", name: "狭き門を超えて", desc: "最難関企業からオファーを勝ち取る", check: (s) => s.offers.some((o) => o.company.tier === 5) || s.jobHistory.some((j) => ["google", "meta", "openai", "anthropic", "deepmind", "mckinsey", "bcg", "palantir"].includes(j.companyId)) },
  {
    id: "globe_trotter",
    name: "百戦錬磨",
    desc: "外資・日系大手・日系中堅すべてを経験する",
    check: (s) => {
      const set = new Set(s.jobHistory.map((j) => j.culture).filter((c) => c !== "startup"));
      return set.size >= 3;
    },
  },
  { id: "fatigue_max", name: "限界突破", desc: "疲労度が95に達する", hidden: true, check: (s) => s.fatigue >= 95 },
  { id: "perfectionist", name: "完璧主義者", desc: "精度スコアを100にする", check: (s) => s.quality >= 100 },
  { id: "beloved", name: "みんなのヒーロー", desc: "満足度スコアを100にする", check: (s) => s.satisfaction >= 100 },
  { id: "bug_slayer", name: "バグハンター", desc: "レビュー/テストでバグを5回早期発見する", check: (s) => (s.counters.bugsCaught ?? 0) >= 5 },
  { id: "lucky_star", name: "強運の持ち主", desc: "チーム相談で幸運を5回引き当てる", check: (s) => (s.counters.luckyConsults ?? 0) >= 5 },
  { id: "viral_star", name: "バズマスター", desc: "プロダクトがバズるレアイベントに遭遇する", hidden: true, check: (s) => (s.counters.viralHits ?? 0) >= 1 },
  { id: "acquisition_lure", name: "秋波を受ける者", desc: "買収オファーのレアイベントに遭遇する", hidden: true, check: (s) => (s.counters.acquisitionOffers ?? 0) >= 1 },
  { id: "five_projects", name: "手練れの証", desc: "累計5個のプロジェクトを完了する", check: (s) => s.totalProjectsCompleted >= 5 },
  { id: "route_ml", name: "MLエンジニアの道", desc: "MLエンジニア特化ルートでエンディングを見る", check: (s, c) => !!c.justSawEnding && s.route === "ml" },
  { id: "route_prompt", name: "プロンプトエンジニアの道", desc: "プロンプトエンジニア特化ルートでエンディングを見る", check: (s, c) => !!c.justSawEnding && s.route === "prompt" },
  { id: "route_mlops", name: "MLOpsエンジニアの道", desc: "インフラ・MLOps特化ルートでエンディングを見る", check: (s, c) => !!c.justSawEnding && s.route === "mlops" },
  { id: "big_spender", name: "豪快な予算執行", desc: "1プロジェクトの予算上限を500以上にする", check: (s) => s.budgetMax >= 500 },
  { id: "resilient", name: "不屈の精神", desc: "満足度10以下から満足度60以上まで立て直す", hidden: true, check: (s) => s.satisfaction >= 60 && s.fatigue <= 40 && s.reputation > 0 },
  { id: "savings_500", name: "貯金家", desc: "個人貯金を500万円まで貯める", check: (s) => s.personalSavings >= 500 },
  { id: "broke", name: "火の車", desc: "個人貯金がマイナスになる", hidden: true, check: (s) => s.personalSavings < 0 },
  { id: "mission_synergist", name: "案件の勘所を掴む者", desc: "ミッションに刺さるアクションを10回選ぶ", check: (s) => (s.counters.missionSynergyHits ?? 0) >= 10 },
  { id: "homeowner", name: "マイホームの主", desc: "マイホームを購入する", check: (s) => s.boughtHouse },
  { id: "married_life", name: "ふたり暮らし", desc: "結婚する", check: (s) => s.married },
  { id: "work_life_balance", name: "ワークライフバランスの鑑", desc: "モチベーション90以上を保つ", check: (s) => s.motivation >= 90 },
  { id: "car_owner", name: "マイカーオーナー", desc: "車を買う", check: (s) => s.ownsCar },
  { id: "pet_owner", name: "もふもふライフ", desc: "ペットを飼う", hidden: true, check: (s) => s.hasPet },
  { id: "new_parent", name: "新米パパ・ママ", desc: "子供が生まれる", check: (s) => s.hasChild },
  { id: "full_house", name: "人生の勝ち組", desc: "マイホーム・結婚・子供・車をすべて達成する", hidden: true, check: (s) => s.boughtHouse && s.married && s.hasChild && s.ownsCar },
  { id: "cert_hunter", name: "資格ハンター", desc: "資格を3つ取得する", check: (s) => s.certifications.length >= 3 },
  { id: "cert_master", name: "資格マスター", desc: "すべての資格を取得する", hidden: true, check: (s) => s.certifications.length >= 6 },
  { id: "found_partner", name: "運命の出会い", desc: "交際相手ができる", check: (s) => s.hasPartner },
];

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;
