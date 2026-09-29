import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StoreSyncBanner from "@/components/StoreSyncBanner";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MAIN = "vitalog:store";

let container: HTMLDivElement;
let root: Root;
let reload: ReturnType<typeof vi.fn>;

function fireStorageEvent(init: StorageEventInit) {
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", init));
  });
}

function findButton(label: string): HTMLButtonElement {
  const btn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(label)
  );
  if (!btn) throw new Error(`button not found: ${label}`);
  return btn as HTMLButtonElement;
}

beforeEach(() => {
  reload = vi.fn();
  vi.stubGlobal("location", { ...window.location, reload });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<StoreSyncBanner />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("複数タブでの同時編集検知", () => {
  it("初期状態では何も表示しない", () => {
    expect(container.textContent).toBe("");
  });

  it("他タブで本データが更新されたら通知を表示する", () => {
    fireStorageEvent({ key: MAIN, newValue: "{}", oldValue: "{}" });
    expect(container.textContent).toContain("別のタブでデータが更新されました");
  });

  it("通知が出ても自動リロードはしない(記入途中のフォームを守る)", () => {
    fireStorageEvent({ key: MAIN, newValue: "{}" });
    expect(reload).not.toHaveBeenCalled();
  });

  it("「再読み込み」ボタンを押した時だけリロードする", () => {
    fireStorageEvent({ key: MAIN, newValue: "{}" });
    act(() => findButton("再読み込み").click());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("「あとで」を押すと通知だけ消え、リロードはされない", () => {
    fireStorageEvent({ key: MAIN, newValue: "{}" });
    act(() => findButton("あとで").click());
    expect(container.textContent).toBe("");
    expect(reload).not.toHaveBeenCalled();
  });

  it("本データ以外のキーの更新には反応しない", () => {
    fireStorageEvent({ key: "vitalog:location", newValue: "{}" });
    fireStorageEvent({ key: "vitalog:store:backup", newValue: "{}" });
    fireStorageEvent({ key: "vitalog:store:temp", newValue: "{}" });
    expect(container.textContent).toBe("");
  });

  it("アンマウント後はイベントに反応しない(リスナーが解除される)", () => {
    act(() => root.unmount());
    fireStorageEvent({ key: MAIN, newValue: "{}" });
    expect(container.textContent).toBe("");
    root = createRoot(container);
  });
});
