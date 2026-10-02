/**
 * ストアのコレクションに対する、id単位の純粋な操作。
 * 配列をまるごと置き換えず、最新のストア(updateStoreが読み直したもの)に対して
 * 「このidのレコードを追加/更新/削除する」という形で変更を表す。
 * こうすると、別のタブが追加した他のidのレコードを消さない。
 */

export interface HasId {
  id: string;
}

/** 同じidがあれば置き換え、無ければ追加する(既定は先頭、position: "end" で末尾) */
export function upsertById<T extends HasId>(
  items: T[],
  item: T,
  position: "start" | "end" = "start"
): T[] {
  const index = items.findIndex((x) => x.id === item.id);
  if (index === -1) return position === "end" ? [...items, item] : [item, ...items];
  const next = items.slice();
  next[index] = item;
  return next;
}

/**
 * 同じidのレコードにだけ変更を適用する。idが無い(別タブで削除された等)場合は何もしない
 * (削除済みのレコードを、古い画面の更新で復活させないため)。
 */
export function patchById<T extends HasId>(items: T[], id: string, patch: (item: T) => T): T[] {
  const index = items.findIndex((x) => x.id === id);
  if (index === -1) return items;
  const next = items.slice();
  next[index] = patch(items[index]);
  return next;
}

export function removeById<T extends HasId>(items: T[], id: string): T[] {
  return items.some((x) => x.id === id) ? items.filter((x) => x.id !== id) : items;
}
