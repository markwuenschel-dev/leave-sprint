/** Google Gemini adapter — structured output via config.responseJsonSchema. */
import { GoogleGenAI } from "@google/genai";
import { OBSERVATIONS_JSON_SCHEMA } from "@waypoint/rubric";
import { assertNotHermeticLiveCall } from "../hermetic";
import { parseObservations, userContent, type GradeInput, type InterviewProvider } from "../types";

export function geminiProvider(opts: { apiKey: string; model?: string }): InterviewProvider {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const model = opts.model ?? "gemini-3.5-flash";
  return {
    id: "gemini",
    model,
    async grade(input: GradeInput) {
      assertNotHermeticLiveCall("gemini.grade");
      const res = await ai.models.generateContent({
        model,
        contents: userContent(input),
        config: {
          systemInstruction: input.system,
          responseMimeType: "application/json",
          responseJsonSchema: OBSERVATIONS_JSON_SCHEMA,
        },
      });
      return parseObservations(res.text ?? "");
    },
    async complete(input: GradeInput) {
      assertNotHermeticLiveCall("gemini.complete");
      const res = await ai.models.generateContent({
        model,
        contents: userContent(input),
        config: { systemInstruction: input.system },
      });
      return res.text ?? "";
    },
  };
}
