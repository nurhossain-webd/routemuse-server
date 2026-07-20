export interface LLMMessage { role: "system" | "user" | "assistant"; content: string }
export interface StructuredGenerationRequest { messages: LLMMessage[]; schemaName: string; jsonSchema: Record<string, unknown> }
export interface LLMProvider { generateStructured(request: StructuredGenerationRequest): Promise<unknown> }
export class InvalidLLMResponseError extends Error {}
