import type { Segment } from "./types";

export const SEGMENT_LABELS: Record<Segment, string> = {
  idm: "IDM（設計〜製造一貫）",
  fabless: "ファブレス（設計専業）",
  foundry: "ファウンドリ（受託製造）",
  memory: "メモリ",
  equipment: "製造装置",
  materials: "材料",
  eda: "EDA（設計ツール）",
  ip: "IPコア",
};

export const SEGMENT_ICONS: Record<Segment, string> = {
  idm: "🏭",
  fabless: "🎨",
  foundry: "🔧",
  memory: "💾",
  equipment: "⚙️",
  materials: "🧪",
  eda: "💻",
  ip: "🧩",
};

// バリューチェーンの並び順（左＝川上の設計寄り、右＝川下の製造・装置寄り、
// くらいのゆるいイメージ。フィルターチップの表示順に使う）。
export const SEGMENT_ORDER: Segment[] = [
  "eda",
  "ip",
  "fabless",
  "idm",
  "memory",
  "foundry",
  "equipment",
  "materials",
];
