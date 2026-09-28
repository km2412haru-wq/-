import Nav from "@/components/Nav";

const DONE_FEATURES = [
  { id: "F1", name: "毎日の体調記録", note: "フル実装" },
  { id: "F2", name: "服薬記録", note: "定期薬/頓服マスタ・テーパリング履歴・フォアグラウンドリマインダー" },
  { id: "F4", name: "データ可視化", note: "体調/気分/体温/睡眠時間のトレンドグラフ" },
  { id: "F8(一部)", name: "データ管理", note: "バージョン管理・マイグレーション・JSON/CSVエクスポート・JSON復元" },
  { id: "F9", name: "スケジュール・負荷管理", note: "負荷感・活動タグ(カスタム可)・睡眠時間" },
  { id: "F10", name: "緊急時検出・受診推奨", note: "ルールベース一次スクリーニング(暫定閾値、診断ではない旨を明記)" },
];

const PLANNED_FEATURES = [
  { id: "F3", name: "環境データ取得", note: "Open-Meteo等から気温・気圧・湿度を自動取得" },
  { id: "F5/F11", name: "相関分析・データサイエンス基盤", note: "ラグ相関分析で症状の伝播パターンを検出" },
  { id: "F6", name: "アラート／予測", note: "個人のベースラインに基づく予防的通知(F10のルールベース判定とは別系統)" },
  { id: "F7", name: "医師向けレポート出力", note: "PDF出力" },
  { id: "F8(残り)", name: "Google Driveバックアップ", note: "OAuth連携による自動バックアップ" },
  { id: "F12-1", name: "仮説検証フレームワーク", note: "登録した仮説の支持率をデータで検証" },
  { id: "F12-2", name: "セルフA/Bテストログ", note: "介入期間を宣言し前後を比較" },
  { id: "F12-3", name: "年次振り返りレビュー", note: "LLM生成の物語的サマリー" },
  { id: "F12-4", name: "ライフステージ移行監視モード", note: "2027年入社前後を要注意期間として自動フラグ" },
  { id: "F12-5", name: "健康×生産性相関記録", note: "任意入力。仮説検証の精度向上にも寄与" },
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
        <h2>今後の機能</h2>
        <p className="muted">
          要件定義書(<code>docs/requirements.md</code>)に基づく実装予定の機能。
          データ型の当たりだけ<code>types/roadmap.ts</code>に用意してある。
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
