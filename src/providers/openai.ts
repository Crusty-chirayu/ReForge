import type { LLMProvider } from "../brain.js";
import type { LLMResponse, OpenAIProviderConfig } from "./types.js";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
}

function sanitize(msg: string, secret: string): string {
  if (!secret) return msg;
  return msg.replaceAll(secret, "[REDACTED_API_KEY]");
}

export class OpenAIProvider implements LLMProvider {
  public readonly name = "openai";
  public readonly model: string;
  public readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  public constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey || typeof config.apiKey !== "string") {
      throw new Error("OpenAIProvider requires a valid apiKey string.");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.model = config.model || DEFAULT_OPENAI_MODEL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async generate(request: { system: string; prompt: string }): Promise<LLMResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`OpenAI network request failed: ${sanitize(msg, this.apiKey)}`);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `OpenAI provider returned HTTP ${response.status}: ${sanitize(errBody.slice(0, 500), this.apiKey)}`
      );
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Failed to parse OpenAI response as JSON.");
    }

    const rawText = payload?.choices?.[0]?.message?.content;
    if (typeof rawText !== "string" || !rawText.trim()) {
      throw new Error("OpenAI provider returned an empty or invalid message content.");
    }

    const cleaned = stripFences(rawText);
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.answer === "string") {
        return {
          answer: parsed.answer,
          confidence: ["HIGH", "MEDIUM", "LOW"].includes(parsed.confidence)
            ? parsed.confidence
            : "MEDIUM",
          inferences: Array.isArray(parsed.inferences)
            ? parsed.inferences.map((inf: any) => ({
                statement: String(inf.statement ?? ""),
                confidence: ["HIGH", "MEDIUM", "LOW"].includes(inf.confidence)
                  ? inf.confidence
                  : "LOW",
              }))
            : [],
          evidence: Array.isArray(parsed.evidence)
            ? parsed.evidence.map((ev: any) => ({
                file: String(ev.file ?? ""),
                detail: String(ev.detail ?? ""),
              }))
            : [],
        };
      }
    } catch {
      // Fallback for non-JSON text
    }

    return {
      answer: rawText.trim(),
      confidence: "MEDIUM",
      inferences: [],
      evidence: [],
    };
  }
}
