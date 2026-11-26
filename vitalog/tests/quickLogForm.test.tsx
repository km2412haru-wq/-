import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QuickLogForm from "@/components/QuickLogForm";
import { localTodayIso, addDaysIso } from "@/lib/dateUtil";
import type { DailyLogDraft } from "@/lib/useDailyLogs";
import type { DailyLog } from "@/types/vitalog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function log(daysAgo: number, extra: Partial<DailyLog> = {}): DailyLog {
  const date = addDaysIso(localTodayIso(), -daysAgo);
  return {
    id: `l${daysAgo}`, targetDate: date, recordedAt: `${date}T09:00:00Z`, skipped: false, jointPain: [], symptoms: [],
    moodReasonTags: [], activityTags: [], medications: [], topicalMedications: [], createdAt: "", updatedAt: "", ...extra,
  };
}

function render(props: Partial<React.ComponentProps<typeof QuickLogForm>> & { historyLogs?: DailyLog[] }) {
  const onSubmit = vi.fn((_d: DailyLogDraft) => true);
  const onSubmitAndAppend = vi.fn((_d: DailyLogDraft) => true);
  const onCancel = vi.fn();
  act(() =>
    root.render(
      <QuickLogForm
        historyLogs={[]}
        onSubmit={onSubmit}
        onSubmitAndAppend={onSubmitAndAppend}
        onCancel={onCancel}
        {...props}
      />
    )
  );
  return { onSubmit, onSubmitAndAppend, onCancel };
}

const text = () => container.textContent ?? "";
function button(label: string): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll("button")).find((x) => x.textContent?.includes(label));
  if (!b) throw new Error(`button not found: ${label}`);
  return b as HTMLButtonElement;
}
const click = (el: HTMLElement) => act(() => { el.click(); });
function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const tempInput = () => container.querySelector("#quickTemperature") as HTMLInputElement;
function checkbox(label: string): HTMLInputElement {
  const l = Array.from(container.querySelectorAll("label")).find((x) => x.textContent?.includes(label));
  return l!.querySelector("input") as HTMLInputElement;
}

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("今日は問題なし(variant=noProblem)", () => {
  it("体温の入力欄は空欄で、前回の体温は参考表示だけ(入力欄に入れない)", () => {
    render({ variant: "noProblem", historyLogs: [log(1, { temperature: 36.8 })] });
    expect(tempInput().value).toBe("");
    expect(container.querySelector("[data-testid=last-temperature]")?.textContent).toContain("36.8");
    expect(text()).toContain("空欄のまま");
  });

  it("前回の体温が無い・古い時は参考表示を出さない", () => {
    render({ variant: "noProblem", historyLogs: [log(20, { temperature: 36.8 })] });
    expect(container.querySelector("[data-testid=last-temperature]")).toBeNull();
  });

  it("何も入力せず保存できる。体温は保存されず(前回値が入らない)、簡易記録・症状なしで保存される", () => {
    const { onSubmit } = render({ variant: "noProblem", historyLogs: [log(1, { temperature: 36.8 })] });
    click(button("問題なしで保存"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const draft = onSubmit.mock.calls[0][0];
    expect(draft).toMatchObject({ entryMode: "quick", skipped: false, symptoms: [], dangerSymptoms: [] });
    expect(draft.temperature).toBeUndefined();
    expect(draft.conditionScore).toBeUndefined();
    expect(draft.fatigueUnusual).toBeUndefined();
  });

  it("症状の入力欄は出さず、体調スコアは任意", () => {
    render({ variant: "noProblem" });
    expect(text()).not.toContain("症状​"); // 見出しの「症状」ラベル(危険な症状とは別)
    expect(Array.from(container.querySelectorAll("label")).some((l) => l.textContent === "症状")).toBe(false);
    expect(text()).toContain("(任意)");
  });

  it("体温が基準以上なら、保存の前に案内を出し、まだ保存しない", () => {
    const { onSubmit } = render({ variant: "noProblem" });
    type(tempInput(), "38.2");
    click(button("問題なしで保存"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(text()).toContain("いつもと違うようです。詳しく記録しますか?");
    expect(text()).toContain("38.2");
    expect(text()).toContain("診断ではなく");
  });

  it("案内から「このまま保存する」で、入力どおりに保存できる(保存を止めない)", () => {
    const { onSubmit } = render({ variant: "noProblem" });
    type(tempInput(), "38.2");
    click(button("問題なしで保存"));
    click(button("このまま保存する"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].temperature).toBe(38.2);
  });

  it("案内から「保存して詳細を追記する」で、保存と追記への遷移が呼ばれる", () => {
    const { onSubmit, onSubmitAndAppend } = render({ variant: "noProblem" });
    click(checkbox("普段と違う強い倦怠感"));
    click(button("問題なしで保存"));
    click(button("保存して詳細を追記する"));
    expect(onSubmitAndAppend).toHaveBeenCalledTimes(1);
    expect(onSubmitAndAppend.mock.calls[0][0].fatigueUnusual).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("案内から「戻って修正する」で案内が消え、入力は残る", () => {
    const { onSubmit } = render({ variant: "noProblem" });
    type(tempInput(), "38.2");
    click(button("問題なしで保存"));
    click(button("戻って修正する"));
    expect(text()).not.toContain("いつもと違うようです");
    expect(tempInput().value).toBe("38.2");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("危険症状を選ぶと案内が出る", () => {
    const { onSubmit } = render({ variant: "noProblem" });
    click(checkbox("息苦しさ"));
    click(button("問題なしで保存"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(text()).toContain("危険な症状が選ばれています");
  });

  it("直近より体調スコアが2以上低いと案内が出る(暫定の目安である旨つき)", () => {
    const { onSubmit } = render({
      variant: "noProblem",
      historyLogs: [log(1, { conditionScore: 8 }), log(2, { conditionScore: 8 }), log(3, { conditionScore: 8 })],
    });
    click(button("5"));
    click(button("問題なしで保存"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(text()).toContain("暫定");
  });

  it("onSubmitAndAppendが無ければ「保存して詳細を追記する」を出さない", () => {
    render({ variant: "noProblem", onSubmitAndAppend: undefined });
    type(tempInput(), "39");
    click(button("問題なしで保存"));
    expect(text()).not.toContain("保存して詳細を追記する");
    expect(text()).toContain("このまま保存する");
  });
});

describe("今日はしんどい(従来の簡易入力)は変わらない", () => {
  it("体調スコアを選ぶまで保存できない", () => {
    render({});
    expect(button("簡易記録を保存").disabled).toBe(true);
    click(button("3"));
    expect(button("簡易記録を保存").disabled).toBe(false);
  });

  it("高い体温でも案内は出さず、そのまま保存する", () => {
    const { onSubmit } = render({});
    click(button("3"));
    type(tempInput(), "39.5");
    click(button("簡易記録を保存"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(text()).not.toContain("いつもと違うようです");
  });

  it("症状の入力欄がある。前回の体温は参考表示される", () => {
    render({ historyLogs: [log(1, { temperature: 36.9 })] });
    expect(Array.from(container.querySelectorAll("label")).some((l) => l.textContent === "症状")).toBe(true);
    expect(tempInput().value).toBe("");
    expect(container.querySelector("[data-testid=last-temperature]")?.textContent).toContain("36.9");
  });
});
