import type { LLMProvider } from "../brain.js";
import { GeminiProvider } from "./gemini.js";
import { OpenAIProvider } from "./openai.js";
import type { ProviderStatus } from "./types.js";

export function createLLMProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider | undefined {
  const explicitProvider = env.REFORGE_LLM_PROVIDER?.toLowerCase().trim();
  const geminiKey = env.GEMINI_API_KEY?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();

  if (explicitProvider === "gemini") {
    if (geminiKey) {
      return new GeminiProvider({
        apiKey: geminiKey,
        model: env.REFORGE_LLM_MODEL || env.GEMINI_MODEL,
      });
    }
    return undefined;
  }

  if (explicitProvider === "openai") {
    if (openaiKey) {
      return new OpenAIProvider({
        apiKey: openaiKey,
        baseUrl: env.REFORGE_OPENAI_BASE_URL || env.OPENAI_BASE_URL,
        model: env.REFORGE_LLM_MODEL || env.OPENAI_MODEL,
      });
    }
    return undefined;
  }

  // Auto-detection when REFORGE_LLM_PROVIDER is not set
  if (geminiKey) {
    return new GeminiProvider({
      apiKey: geminiKey,
      model: env.REFORGE_LLM_MODEL || env.GEMINI_MODEL,
    });
  }

  if (openaiKey) {
    return new OpenAIProvider({
      apiKey: openaiKey,
      baseUrl: env.REFORGE_OPENAI_BASE_URL || env.OPENAI_BASE_URL,
      model: env.REFORGE_LLM_MODEL || env.OPENAI_MODEL,
    });
  }

  return undefined;
}

export function getProviderStatus(provider?: LLMProvider): ProviderStatus {
  if (!provider) {
    return {
      configured: false,
      provider: null,
      model: null,
    };
  }

  return {
    configured: true,
    provider: (provider as any).name ?? "custom",
    model: (provider as any).model ?? null,
  };
}
