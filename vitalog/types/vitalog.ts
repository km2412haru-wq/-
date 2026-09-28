/**
 * データ構造のバージョン。
 * 仕様変更時は上げる前に必ず lib/migrate.ts に旧バージョンからの変換関数を追加すること
 * (F8: 「データの引き継ぎやすさ」を最優先する設計方針のため、破壊的変更をしない)。
 */
export const SCHEMA_VERSION = 1;

export const JOINT_SITES = ["膝", "手", "足", "肘", "肩", "その他"] as const;
export type JointSite = (typeof JOINT_SITES)[number];

export interface JointPainEntry {
  site: JointSite;
  /** 1(軽い)〜5(激しい) */
  severity: 1 | 2 | 3 | 4 | 5;
}

export const MOOD_REASON_TAGS = [
  "体調不良",
  "人間関係",
  "将来不安",
  "疲労",
  "特になし",
] as const;
export type MoodReasonTag = (typeof MOOD_REASON_TAGS)[number];

export const MEDICATION_TYPES = ["regular", "asNeeded"] as const;
export type MedicationType = (typeof MEDICATION_TYPES)[number];

export interface MedicationRecord {
  id: string;
  name: string;
  /** 用量。単位込みの自由記述(例: "5mg") */
  dose?: string;
  /** 定期薬か頓服か */
  type: MedicationType;
  /** 服薬時刻(HH:mm)。未入力可 */
  time?: string;
  /** 写真から自動入力した場合、元になった写真のIndexedDB上のID(ユーザーが保持を選んだ場合のみ) */
  sourcePhotoId?: string;
  /**
   * 登録済みの定期薬(RegisteredMedication)由来のチェックリスト項目である場合、その参照ID。
   * 手動追加・頓服・写真からの追加にはundefined。
   */
  registeredMedicationId?: string;
  /**
   * registeredMedicationId経由の場合の服用有無。既定はチェック済み(服用した)で、
   * 外した場合はfalseとして明示的に記録する(記録が無い状態にはしない。アドヒアランス確認のため)。
   */
  taken?: boolean;
}

/** 外用薬(シップ・ローション等)の記録1件。内服のMedicationRecordとは用法が違うため分けて持つ */
export interface TopicalMedicationRecord {
  id: string;
  name: string;
  /** 使用部位(任意・自由記述) */
  site?: string;
  note?: string;
  sourcePhotoId?: string;
}

/**
 * F2: 登録済みの定期薬・頓服マスタ。
 * DailyLogのmedications(その日実際に飲んだ記録)とは別に、
 * 「普段飲んでいる薬」を管理してリマインダーの元データにする。
 */
export interface RegisteredMedication {
  id: string;
  name: string;
  dose?: string;
  type: MedicationType;
  /** リマインダーを出す時刻(HH:mm)。頓服は空でよい */
  reminderTime?: string;
  /** 服用終了済み(減薬完了・中止)の薬は非表示にできるようfalseにする */
  active: boolean;
  /**
   * 処方開始日(登録日)。バックフィル入力時、対象日がこれより前の場合は
   * まだ処方されていなかった薬として毎日の記録のチェックリストに出さないために使う。
   * 未設定(旧データ)の場合はいつの対象日でも表示可能として扱う。
   */
  startDate?: string;
  /**
   * 中止日。中止(active=false)にした日を記録し、対象日がこれより後の場合は
   * チェックリストに出さない。対象日がこれ以前(中止前)なら引き続き表示する。
   * 再開時はクリアする。
   */
  endDate?: string;
  createdAt: string;
}

/** F2: 減薬・増薬(テーパリング)履歴1件 */
export interface TaperingEvent {
  id: string;
  medicationName: string;
  date: string;
  /** 変更後の用量(自由記述) */
  newDose: string;
  note?: string;
  createdAt: string;
}

/** 通院記録1件。検査値は対象日=受診日としてDailyLog.labsにも反映される(bulkImport.ts経由) */
export interface Visit {
  id: string;
  visitDate: string;
  hospitalName?: string;
  department?: string;
  memo?: string;
  /** 次回受診予定日(任意) */
  nextVisitDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const ACTIVITY_TAGS = [
  "授業",
  "バイト",
  "部活",
  "ゼミ",
  "資格勉強",
  "仕事",
  "通勤",
  "シフト",
] as const;
export type ActivityTag = (typeof ACTIVITY_TAGS)[number] | string;

export const LOAD_LEVELS = ["暇", "普通", "過密"] as const;
export type LoadLevel = (typeof LOAD_LEVELS)[number];

/** F12-1: 自分で登録する仮説(例:「気圧低下を3日後に関節痛」) */
export interface Hypothesis {
  id: string;
  statement: string;
  createdAt: string;
  /** 支持しているかどうかの手応え(任意メモ)。統計的な支持率算出はF5/F11実装後 */
  note?: string;
}

/** F12-2: セルフA/Bテストの介入宣言 */
export interface SelfExperiment {
  id: string;
  description: string;
  startDate: string;
  /** 未終了ならundefined(進行中) */
  endDate?: string;
  createdAt: string;
}

/**
 * F1: 毎日の体調記録。
 * 「いつでも記録可能」「後入力・スキップ可」の方針のため、
 * 記録対象日(targetDate)と実際の入力時刻(recordedAt)を分けて持つ。
 */
export interface DailyLog {
  id: string;
  /** この記録が対象とする日(YYYY-MM-DD)。後入力時はここを過去日にする */
  targetDate: string;
  /** 実際に入力ボタンを押した日時(ISO8601)。改ざんしない実入力ログ */
  recordedAt: string;
  /** この日は「スキップ」を選んだ記録かどうか。trueの場合、他の値は無視してよい */
  skipped: boolean;

  // --- 必須項目 ---
  /**
   * 体温(℃)。3つの状態を区別する:
   * - undefined: 未入力(入力し忘れ、または過去データにフィールド自体がない)
   * - "unmeasured": ユーザーが明示的に「測っていない」を選んだ
   * - number: 実測値
   * トレンドグラフ等ではnumber以外を欠損として扱う(0℃扱いはしない)
   */
  temperature?: number | "unmeasured";
  /** 体調スコア 1(最悪)〜10(絶好調) */
  conditionScore?: number;
  jointPain: JointPainEntry[];
  /** 咽頭痛。「普段と違う感覚」を拾いたいため強さに加えて自由記述を持てる */
  soreThroat?: {
    severity: 1 | 2 | 3 | 4 | 5;
    /** 「いつもと違う」感覚があった場合のメモ */
    unusualNote?: string;
  };
  /** 気分スコア 1〜10。常時表示 */
  moodScore?: number;
  /** moodScore が低い時のみ入力される理由タグ */
  moodReasonTags: MoodReasonTag[];
  /**
   * F10向け: 「普段と違う強い倦怠感」の有無。
   * conditionScoreだけでは拾えない質的な違和感を単独フラグとして残す。
   */
  fatigueUnusual?: boolean;

  // --- F9: スケジュール・負荷管理(時間単位ではなくざっくり記録) ---
  loadLevel?: LoadLevel;
  activityTags: ActivityTag[];
  /** 睡眠時間(時間、0.5刻み) */
  sleepHours?: number;

  /** F12-5: 健康×生産性相関記録(任意)。その日の成果実感 1〜10 */
  productivityScore?: number;

  /**
   * F3: 環境データ(気温・気圧・湿度)。Open-Meteoから自動取得。
   * 取得元は対象日が今日なら現在値API、過去日ならアーカイブAPI。
   */
  environment?: {
    temperatureC?: number;
    pressureHpa?: number;
    humidityPercent?: number;
  };

  // --- 任意・低優先度項目 ---
  /**
   * 皮疹(実験的機能)。写真はlocalStorageの容量制限(5〜10MB程度)を圧迫しないよう、
   * 他の写真機能と同様にIndexedDB(lib/photoStore.ts)に保存し、ここには参照IDのみ持つ。
   * 旧バージョンで直接埋め込まれていたphotoDataUrlは読み込み時に無視する(データは残るが表示はされない)。
   */
  rash?: {
    note?: string;
    sourcePhotoId?: string;
  };
  musclePain?: {
    severity: 1 | 2 | 3 | 4 | 5;
    note?: string;
  };
  lymphNodeSwelling?: {
    note?: string;
  };
  /**
   * F10向け検査値(採血結果を受け取った時だけ任意入力)。
   * MAS等の重篤合併症の急変検知にのみ使う、通常のトレンドには出さない値。
   */
  labs?: {
    wbcPerUl?: number;
    ferritinNgMl?: number;
    crpMgDl?: number;
    astUL?: number;
    altUL?: number;
    plateletsPerUl?: number;
    /** 写真から自動入力した場合、元になった検査結果票の写真ID(ユーザーが保持を選んだ場合のみ) */
    sourcePhotoId?: string;
  };

  medications: MedicationRecord[];
  topicalMedications: TopicalMedicationRecord[];

  /** 自由メモ。Web Speech APIによる音声入力も同じ欄に反映される */
  memo?: string;
  /** LLMによるメモの構造化タグ付け結果(任意・失敗しても記録自体は成立する) */
  memoTags?: string[];

  createdAt: string;
  updatedAt: string;
}

/**
 * localStorageに保存する際の実データ形式(バージョン付き)。
 * registeredMedications/taperingEventsはv1に対する後方互換な追加フィールド
 * (旧データには存在しないため、読み込み時に空配列で補う。lib/migrate.ts参照)。
 */
export interface VitalogStoreV1 {
  version: 1;
  dailyLogs: DailyLog[];
  registeredMedications: RegisteredMedication[];
  taperingEvents: TaperingEvent[];
  hypotheses: Hypothesis[];
  selfExperiments: SelfExperiment[];
  visits: Visit[];
}

export type VitalogStore = VitalogStoreV1;
