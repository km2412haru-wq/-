import { describe, expect, it } from "vitest";
import {
  DANGER_FIXED_REPLY,
  REPLY_FALLBACK,
  SELF_HARM_FIXED_REPLY,
  detectSafetyTrigger,
  fixedReplyFor,
  sanitizeReply,
} from "@/lib/chatSafety";

describe("危険症状の検知(固定文を返す入力)", () => {
  it.each([
    "息が苦しいです",
    "息ができない",
    "呼吸が苦しくて",
    "呼吸困難っぽい",
    "胸が痛いです",
    "胸の痛みが続く",
    "胸が締め付けられる",
    "胸部の圧迫感",
    "意識が遠のく感じがします",
    "失神しました",
    "気を失いそうでした",
    "動悸がひどいです",
    "急にむくみが出ました",
    "血を吐きました",
    "吐血した",
    "黒い便が出ました",
    "出血が止まらない",
    "激しい腹痛があります",
  ])("「%s」は危険症状として検知する", (text) => {
    expect(detectSafetyTrigger(text)).toBe("danger");
  });

  it.each([
    "最近の睡眠時間の傾向を教えてください",
    "関節痛が続いています",
    "熱が37.5度ありました",
    "次の診察で何を聞けばいいですか",
    "胸の話ではなく、膝が痛い日が増えました",
    "倦怠感の記録が多い理由は?",
  ])("「%s」は検知しない(通常の相談)", (text) => {
    expect(detectSafetyTrigger(text)).toBeNull();
  });
});

describe("つらい気持ちの訴えの検知", () => {
  it.each([
    "死にたいと思ってしまいます",
    "消えたい",
    "もういなくなりたい",
    "自傷してしまいそうです",
    "生きていたくない",
    "生きる意味がない気がして",
  ])("「%s」は検知する", (text) => {
    expect(detectSafetyTrigger(text)).toBe("selfHarm");
  });

  it("身体症状より先に、つらい気持ちの訴えを判定する", () => {
    expect(detectSafetyTrigger("息が苦しくて、もう死にたい")).toBe("selfHarm");
  });
});

describe("固定文の内容", () => {
  it("危険症状の固定文は、診断をせず、医療機関への連絡と119を案内する", () => {
    expect(fixedReplyFor("danger")).toBe(DANGER_FIXED_REPLY);
    expect(DANGER_FIXED_REPLY).toContain("医療機関");
    expect(DANGER_FIXED_REPLY).toContain("119");
    expect(DANGER_FIXED_REPLY).toContain("診断ではなく");
    expect(DANGER_FIXED_REPLY).not.toMatch(/大丈夫|心配(ありません|いりません)/);
  });

  it("つらい気持ちの固定文は、相談窓口の名称のみで、誤った番号を案内しない(119以外の電話番号を含まない)", () => {
    expect(fixedReplyFor("selfHarm")).toBe(SELF_HARM_FIXED_REPLY);
    expect(SELF_HARM_FIXED_REPLY).toContain("119");
    expect(SELF_HARM_FIXED_REPLY).toContain("主治医");
    expect(SELF_HARM_FIXED_REPLY).toContain("公式サイトで確認");
    const digits = SELF_HARM_FIXED_REPLY.match(/\d[\d-]*/g) ?? [];
    expect(digits).toEqual(["119"]);
  });
});

describe("出力の安全網(sanitizeReply)", () => {
  it.each([
    ["大丈夫ですよ。心配しないでください。", "安心の断定"],
    ["今の記録なら問題ありません。", "安心の断定"],
    ["心配いりません。", "安心の断定"],
    ["それは成人スティル病の再燃です。", "診断の断定"],
    ["診断します。", "診断の断定"],
    ["プレドニンを減らしてください。", "治療の指示"],
    ["ステロイドをやめた方がいいでしょう。", "治療の指示"],
    ["アクテムラを変更してもよいかもしれません。", "治療の指示"],
    ["これは緊急です。", "緊急性の判定"],
    ["今すぐ危険な状態です。", "緊急性の判定"],
  ])("「%s」は置き換える(%s)", (text, reason) => {
    const r = sanitizeReply(text);
    expect(r.reply).toBe(REPLY_FALLBACK);
    expect(r.filteredReason).toBe(reason);
  });

  it.each([
    "直近30日で、体調スコアの平均は5.2でした。",
    "睡眠が短い日に関節痛の記録が多い傾向がありますが、因果関係は分かりません。",
    "このデータだけでは大丈夫とは言えません。主治医と一緒に判断してください。",
    "記録がない日は、症状がなかったという意味ではありません。",
    "薬については、主治医の判断になります。次の診察で、飲み心地について相談してみてください。",
    "アプリの注意条件に該当した記録はありません。ただし、問題がないという意味ではありません。",
    "ご心配ですね。",
    "「大丈夫ですか?」と不安になりますよね。",
    "これは成人スティル病の記録を整理した結果です。",
    "AOSDの再燃かどうかは、私には判断できません。",
  ])("通常の返信「%s」は置き換えない(否定形・限定的な言い方を誤検知しない)", (text) => {
    const r = sanitizeReply(text);
    expect(r.reply).toBe(text);
    expect(r.filteredReason).toBeNull();
  });
});
