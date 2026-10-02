/**
 * チャットの設定(同意・表示・メモ)。端末のlocalStorageにだけ保存する。
 * 保存データ本体(vitalog:store)とは別のキーにして、データの移行・復元・書き出しに影響させない。
 * 利用者が書く「自分についてのメモ」も、ここ(端末内)にだけ置く。コードには含めない。
 */
const KEY = "vitalog:chat:settings";

export interface ChatSettings {
  /** 記録の要約をAPIに送ることへの同意 */
  consented: boolean;
  concise: boolean;
  includeMemos: boolean;
  userNotes: string;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  consented: false,
  concise: false,
  includeMemos: false,
  userNotes: "",
};

export function loadChatSettings(): ChatSettings {
  if (typeof window === "undefined") return DEFAULT_CHAT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CHAT_SETTINGS;
    const p = JSON.parse(raw) as Partial<ChatSettings>;
    return {
      consented: p.consented === true,
      concise: p.concise === true,
      includeMemos: p.includeMemos === true,
      userNotes: typeof p.userNotes === "string" ? p.userNotes : "",
    };
  } catch {
    return DEFAULT_CHAT_SETTINGS;
  }
}

export function saveChatSettings(settings: ChatSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("チャットの設定を保存できませんでした:", err);
  }
}
