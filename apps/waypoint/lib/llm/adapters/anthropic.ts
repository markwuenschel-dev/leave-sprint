/** Anthropic (Claude) adapter — structured output via output_config.format. */
import Anthropic from "@anthropic-ai/sdk";
import { OBSERVATIONS_JSON_SCHEMA } from "@waypoint/rubric";
import { parseObservations, userContent, type GradeInput, type InterviewProvider } from "../types";

export function anthropicProvider(opts: { apiKey: string; model?: string }): InterviewProvider {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const model = opts.model ?? "claude-opus-4-8";
  return {
    id: "anthropic",
    model,
    async grade(input: GradeInput) {
      const res = await client.messages.create({
        model,
        max_tokens: 4096,
        system: input.system,
        output_config: { format: { type: "json_schema", schema: OBSERVATIONS_JSON_SCHEMA } },
        messages: [{ role: "user", content: userContent(input) }],
      } as Anthropic.MessageCreateParamsNonStreaming);
      const text = res.content.find((b) => b.type === "text");
      return parseObservations(text && "text" in text ? text.text : "");
    },
    async complete(input: GradeInput) {
      const res = await client.messages.create({
        model,
        max_tokens: 1024,
        system: input.system,
        messages: [{ role: "user", content: userContent(input) }],
      });
      const text = res.content.find((b) => b.type === "text");
      return text && "text" in text ? text.text : "";
    },
  };
}
