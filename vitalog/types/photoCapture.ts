/**
 * 写真ベースの自動記録機能(F1拡張)の型定義。
 * 既存のメモの自動タグ付け(lib/anthropic.ts, ANTHROPIC_MODEL=Haiku)と
 * 同じコスト最適化方針で、Vision対応のLLMに画像を渡し構造化データを抽出する。
 *
 * 重要: 抽出結果はこのまま保存してはいけない。必ずユーザーの確認・編集を
 * 経てからDailyLogにマージすること(components/PhotoCaptureButton.tsx参照)。
 */

export const PHOTO_CAPTURE_KINDS = [
  "medication",
  "topical",
  "labResult",
  "medicationNotebook",
] as const;
export type PhotoCaptureKind = (typeof PHOTO_CAPTURE_KINDS)[number];

/** 服薬(内服)パッケージ/シート/説明書/処方箋からの抽出結果 */
export interface ExtractedMedicationFields {
  name?: string;
  dose?: string;
  /** 処方箋等に印字された日付(処方日)。書類の一括インポート時のみ使う */
  documentDate?: string;
}

/** 外用薬(シップ・ローション等)パッケージからの抽出結果 */
export interface ExtractedTopicalFields {
  name?: string;
  site?: string;
  note?: string;
}

/** 血液検査結果票からの抽出結果 */
export interface ExtractedLabFields {
  wbcPerUl?: number;
  ferritinNgMl?: number;
  crpMgDl?: number;
  astUL?: number;
  altUL?: number;
  plateletsPerUl?: number;
  esrMmH?: number;
  /** 採血日。書類の一括インポート時のみ使う */
  documentDate?: string;
}

/** お薬手帳1ページ分から抽出した薬1件 */
export interface ExtractedNotebookEntry {
  name?: string;
  dose?: string;
  documentDate?: string;
}

/** お薬手帳(複数の薬・複数の受診日がテーブル状に並ぶ)からの抽出結果 */
export interface ExtractedNotebookFields {
  entries: ExtractedNotebookEntry[];
}

export type ExtractedFieldsFor<K extends PhotoCaptureKind> = K extends "medication"
  ? ExtractedMedicationFields
  : K extends "topical"
    ? ExtractedTopicalFields
    : K extends "labResult"
      ? ExtractedLabFields
      : ExtractedNotebookFields;

/** POST /api/extract-photo のレスポンス形式 */
export interface ExtractPhotoResponse {
  /** 抽出に失敗、またはAPIキー未設定時はfieldsがnullになる(手動入力へフォールバック) */
  fields: Record<string, unknown> | null;
  /** ユーザーに見せる補足メッセージ(失敗理由など) */
  message?: string;
}
