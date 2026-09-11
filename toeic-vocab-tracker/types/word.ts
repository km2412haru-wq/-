/** 品詞。TOEIC学習で重要な4種+その他 */
export const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb", "other"] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

/** 登録済みの単語1件(元の単語・派生語ともに同じ型で保持する) */
export interface WordEntry {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech: PartOfSpeech;
  /** 覚えた: true / 未定着: false */
  memorized: boolean;
  /** ISO8601形式の登録日時 */
  createdAt: string;
  /** 単語グループのID。元の単語のidをそのままグループIDとして使う */
  groupId: string;
  /** このグループの起点(最初に手動登録した単語)かどうか */
  isRoot: boolean;
}

/** 並び替えの種類 */
export type SortKey = "createdAtDesc" | "createdAtAsc" | "alphabetical";

/** 覚えた/未定着による絞り込み */
export type MemorizedFilter = "all" | "memorized" | "unmemorized";

/** 一覧の表示モード */
export type ViewMode = "list" | "group";

/** AIが提案する派生語1件分(まだ登録されていない状態) */
export interface DerivativeSuggestion {
  word: string;
  meaning: string;
  partOfSpeech: PartOfSpeech;
}

/** 提案パネルで管理する、編集・採否のUI状態を持った派生語候補 */
export interface EditableSuggestion extends DerivativeSuggestion {
  /** UI内で一意に識別するためのキー */
  key: string;
  status: "pending" | "accepted" | "rejected";
}
