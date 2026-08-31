import { GoogleGenAI, Type } from "@google/genai";

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。.env.local.example を参考に .env.local を作成してください。"
    );
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/** Geminiに要求するJSON出力の構造(Gemini structured output用スキーマ) */
const QUESTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    keyConcept: { type: Type.STRING },
    question: { type: Type.STRING },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    correctIndex: { type: Type.INTEGER },
    explanationByChoice: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "keyConcept",
    "question",
    "choices",
    "correctIndex",
    "explanationByChoice",
  ],
};

/** Geminiの生JSON応答(まだバリデーション前)の型 */
export interface RawGeminiQuestion {
  keyConcept: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanationByChoice: string[];
}

export async function callGeminiForQuestion(params: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<RawGeminiQuestion> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model,
    contents: params.userPrompt,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: QUESTION_RESPONSE_SCHEMA,
      temperature: 1.0,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini APIからの応答が空でした。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini APIの応答をJSONとして解析できませんでした: ${text}`);
  }

  return parsed as RawGeminiQuestion;
}
