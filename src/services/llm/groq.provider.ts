import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { InvalidLLMResponseError, type LLMProvider, type StructuredGenerationRequest } from "./llm-provider.js";

const responseSchema = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1) });

export class GroqProvider implements LLMProvider {
  async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    if (!env.GROQ_API_KEY) throw new AppError("AI planning is not configured", 503);
    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: env.GROQ_MODEL, temperature: 0.2, messages: request.messages,
          response_format: { type: "json_schema", json_schema: { name: request.schemaName, strict: true, schema: request.jsonSchema } } }),
        signal: AbortSignal.timeout(45_000),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("The AI provider is currently unavailable", 502);
    }
    if (!response.ok) throw new AppError("The AI provider could not generate a plan", 502);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new InvalidLLMResponseError("Unexpected provider response");
    try { return JSON.parse(parsed.data.choices[0]!.message.content) as unknown; }
    catch { throw new InvalidLLMResponseError("Invalid provider JSON"); }
  }
}
