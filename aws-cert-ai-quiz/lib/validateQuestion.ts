import { z } from "zod";
import type { RawGeminiQuestion } from "./gemini";

/**
 * Geminiの応答が期待した形になっているかを検証する。
 * (JSONスキーマ指定だけでは choices の要素数や correctIndex の範囲までは
 * 保証されないため、ここで実データを検査する)
 */
// 未知のフィールドが混ざっていてもエラーにせず無視する(strictにしない)
const questionSchema = z.object({
  keyConcept: z.string().min(1),
  question: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanationByChoice: z.array(z.string().min(1)).length(4),
});

export type ValidatedQuestion = z.infer<typeof questionSchema>;

export function validateGeminiQuestion(raw: RawGeminiQuestion): ValidatedQuestion {
  return questionSchema.parse(raw);
}
