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
  {
    id: "F10",
    name: "緊急時検出・受診推奨",
    note: "ルールベース一次スクリーニング(暫定閾値、診断ではない旨を明記)。発熱・倦怠感/検査値(フェリチン・血小板・WBC・AST/ALT)/症状の急変/発熱を伴わない倦怠感の遷延の4ルート。解熱薬服用中は発熱閾値を下げ敏感化(発熱マスキング対応)。記録のない日は「症状なし」と扱わず、データ不足を表示。危険症状(Danger層)は別ロジック・別バナーで独立検知",
  },
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
  {
    id: "F5/F6/F11",
    name: "相関分析・アラート予測(叩き台)",
    note:
      "ラグ相関分析(トレンド画面下部)。30/90/365日での段階解禁ではなく、記録があるだけ常に" +
      "計算し、サンプル数に応じた信頼度ラベル(参考程度/傾向あり/一定の信頼度)を添えて表示する" +
      "方針に変更。コアロジックは本人によるレビュー・手直しを前提とした叩き台の位置づけ",
  },
];

const PLANNED_FEATURES: { id: string; name: string; note: string }[] = [];

/**
 * F12-3(年次振り返りレビュー)は要件定義書の候補機能だったが、
 * 本人の判断で「不要かもしれない」と方針転換されたため、今後の機能一覧から除外した。
 * 復活させる場合はdocs/requirements.mdのF12-3の節を参照。
 */

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
      {PLANNED_FEATURES.length > 0 && (
        <div className="card">
          <h2>今後の機能(データ蓄積待ち)</h2>
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
      )}
    </main>
  );
}
