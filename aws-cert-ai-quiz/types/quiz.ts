/** 対応資格ID */
export type ExamId = "CP" | "SAA";

/** 出題ドメイン(公式試験ガイドの分野) */
export interface ExamDomain {
  /** ドメイン番号(1始まり、試験ガイドの表記に合わせる) */
  id: number;
  /** ドメイン名(日本語) */
  name: string;
  /** 公式試験ガイド上の出題比率(%) */
  weight: number;
  /** このドメインの代表的なトピック(サービス名・概念など) */
  topics: string[];
}

/** 資格ごとの出題ガイド */
export interface ExamGuide {
  id: ExamId;
  /** 正式名称 */
  name: string;
  /** 出典・版数のメモ(試験ガイド改定時の更新目印) */
  sourceNote: string;
  domains: ExamDomain[];
}

/** Geminiが生成した1問(採点前、正解情報を含む) */
export interface GeneratedQuestion {
  exam: ExamId;
  /** 出題ドメインのid(ExamDomain.id) */
  domain: number;
  /** 出題時に指定したトピック */
  topics: string[];
  /** この問題が問おうとしている要点(重複防止に後で使う一文) */
  keyConcept: string;
  question: string;
  /** 4択の選択肢(長さ4) */
  choices: string[];
  /** 正解の選択肢インデックス(0-3) */
  correctIndex: number;
  /** 各選択肢に対応する解説(choicesと同じ順・同じ長さ) */
  explanationByChoice: string[];
}
