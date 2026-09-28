import Nav from "@/components/Nav";

const DONE_FEATURES = [
  { id: "F1", name: "毎日の体調記録", note: "フル実装" },
  { id: "F2", name: "服薬記録", note: "定期薬/頓服マスタ・テーパリング履歴・フォアグラウンドリマインダー" },
  { id: "F3", name: "環境データ取得", note: "Open-Meteoから気温・気圧・湿度を自動取得(位置情報の許可が必要)" },
  { id: "F4", name: "データ可視化", note: "体調/気分/体温/睡眠時間のトレンドグラフ" },
  { id: "F7", name: "医師向けレポート出力", note: "統計サマリーを印刷/PDF保存できる画面" },
  {
    id: "F8",
    name: "データ管理",
    note: "バージョン管理・マイグレーション・JSON/CSVエクスポート・JSON復元・Google Driveバックアップ(OAuth設定時)",
  },
  { id: "F9", name: "スケジュール・負荷管理", note: "負荷感・活動タグ(カスタム可)・睡眠時間" },
  { id: "F10", name: "緊急時検出・受診推奨", note: "ルールベース一次スクリーニング(暫定閾値、診断ではない旨を明記)" },
  {
    id: "F12-1",
    name: "仮説検証フレームワーク",
    note: "仮説の登録・一覧のみ(支持率の自動算出はF5/F11実装後)",
  },
  { id: "F12-2", name: "セルフA/Bテストログ", note: "介入期間の宣言と前後の体調スコア比較" },
  {
    id: "F12-4",
    name: "ライフステージ移行監視モード",
    note: "2027年4月前後を要注意期間として自動フラグ、F10の閾値を敏感化",
  },
  { id: "F12-5", name: "健康×生産性相関記録", note: "任意入力の成果実感スコア" },
  {
    id: "F1拡張",
    name: "写真ベースの自動記録",
    note: "服薬/外用薬/検査結果票の写真をVision LLMで解析し、確認・編集を挟んでから記録に反映",
  },
  {
    id: "F2拡張",
    name: "服薬管理の抜本改善",
    note:
      "過去の処方箋・検査結果の一括インポート、定期薬のチェック方式入力、お薬手帳写真からの差分更新(新規/用量変更/中止候補)",
  },
  {
    id: "F13(新規)",
    name: "通院管理",
    note: "受診日・病院名・検査結果/お薬手帳の写真・メモ・次回受診予定をまとめて記録(/visits)。レポート画面にも連携",
  },
];

const PLANNED_FEATURES = [
  {
    id: "F5/F6/F11",
    name: "相関分析・アラート予測",
    note: "ラグ相関分析で症状の伝播パターンを検出。データ量に応じて段階解禁(30/90/365日)する設計のため、データ蓄積後に着手",
  },
  {
    id: "F12-3",
    name: "年次振り返りレビュー",
    note: "LLM生成の物語的サマリー。1年分のデータが前提のため、データ蓄積後に着手",
  },
];

export default function RoadmapPage() {
  return (
    <main>
      <h1>Vitalog</h1>
      <Nav />
      <div className="card">
        <h2>実装済みの機能</h2>
        {DONE_FEATURES.map((f) => (
          <div key={f.id} className="log-entry">
            <strong>
              {f.id} {f.name}
            </strong>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {f.note}
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>今後の機能(データ蓄積待ち)</h2>
        <p className="muted">
          要件定義書(<code>docs/requirements.md</code>)の設計思想通り、データ量に応じて
          段階的に解禁する前提の機能。今作ってもデータが無く意味を持たないため、記録を
          続けながら着手時期を判断する。
        </p>
        {PLANNED_FEATURES.map((f) => (
          <div key={f.id} className="log-entry">
            <strong>
              {f.id} {f.name}
            </strong>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {f.note}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
