import type { LLMProvider } from "../brain.js";
import type { GeminiProviderConfig, LLMResponse } from "./types.js";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
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

export class GeminiProvider implements LLMProvider {
  public readonly name = "gemini";
  public readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  public constructor(config: GeminiProviderConfig) {
    if (!config.apiKey || typeof config.apiKey !== "string") {
      throw new Error("GeminiProvider requires a valid apiKey string.");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_GEMINI_MODEL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async generate(request: { system: string; prompt: string }): Promise<LLMResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      system_instruction: {
        parts: [{ text: request.system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Gemini network request failed: ${sanitize(msg, this.apiKey)}`);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `Gemini provider returned HTTP ${response.status}: ${sanitize(errBody.slice(0, 500), this.apiKey)}`
      );
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch (err) {
      throw new Error("Failed to parse Gemini response as JSON.");
    }

    const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== "string" || !rawText.trim()) {
      throw new Error("Gemini provider returned an empty or invalid content part.");
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
      // Fallback if model returned unstructured plain text
    }

    return {
      answer: rawText.trim(),
      confidence: "MEDIUM",
      inferences: [],
      evidence: [],
    };
  }
}
