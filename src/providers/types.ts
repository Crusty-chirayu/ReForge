import type { Evidence } from "../domain.js";

export interface LLMResponse {
  answer: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  inferences?: { statement: string; confidence?: "HIGH" | "MEDIUM" | "LOW" }[];
  evidence?: Evidence[];
}

export interface BaseProviderConfig {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

export interface GeminiProviderConfig extends BaseProviderConfig {}

export interface OpenAIProviderConfig extends BaseProviderConfig {
  baseUrl?: string;
}

export interface ProviderStatus {
  configured: boolean;
  provider: "gemini" | "openai" | null;
  model: string | null;
}
