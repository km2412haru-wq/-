/**
 * 写真ベースの自動記録機能(F1拡張)の型定義。
 * 既存のメモの自動タグ付け(lib/anthropic.ts, ANTHROPIC_MODEL=Haiku)と
 * 同じコスト最適化方針で、Vision対応のLLMに画像を渡し構造化データを抽出する。
 *
 * 重要: 抽出結果はこのまま保存してはいけない。必ずユーザーの確認・編集を
 * 経てからDailyLogにマージすること(components/PhotoCaptureButton.tsx参照)。
 */

export const PHOTO_CAPTURE_KINDS = ["medication", "topical", "labResult"] as const;
export type PhotoCaptureKind = (typeof PHOTO_CAPTURE_KINDS)[number];

/** 服薬(内服)パッケージ/シート/説明書からの抽出結果 */
export interface ExtractedMedicationFields {
  name?: string;
  dose?: string;
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
}

export type ExtractedFieldsFor<K extends PhotoCaptureKind> = K extends "medication"
  ? ExtractedMedicationFields
  : K extends "topical"
    ? ExtractedTopicalFields
    : ExtractedLabFields;

/** POST /api/extract-photo のレスポンス形式 */
export interface ExtractPhotoResponse {
  /** 抽出に失敗、またはAPIキー未設定時はfieldsがnullになる(手動入力へフォールバック) */
  fields: Record<string, unknown> | null;
  /** ユーザーに見せる補足メッセージ(失敗理由など) */
  message?: string;
}
