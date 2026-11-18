import assert from "node:assert/strict";
import test from "node:test";
import { GeminiProvider } from "../src/providers/gemini.js";
import { OpenAIProvider } from "../src/providers/openai.js";
import { createLLMProvider, getProviderStatus } from "../src/providers/factory.js";

test("GeminiProvider: requires valid apiKey", () => {
  assert.throws(() => new GeminiProvider({ apiKey: "" }), /requires a valid apiKey/);
});

test("GeminiProvider: generates structured response from successful API call", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedBody: any;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    answer: "Reforge is an AI engineering intelligence platform.",
                    confidence: "HIGH",
                    inferences: [{ statement: "It has deterministic AST analysis.", confidence: "HIGH" }],
                    evidence: [{ file: "src/engine.ts", detail: "AST analysis" }],
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const provider = new GeminiProvider({
      apiKey: "test-gemini-secret-key",
      model: "gemini-2.0-flash",
    });

    const result = await provider.generate({
      system: "System instructions",
      prompt: "What is Reforge?",
    });

    assert.ok(capturedUrl.includes("generativelanguage.googleapis.com"));
    assert.ok(capturedUrl.includes("gemini-2.0-flash"));
    assert.ok(capturedUrl.includes("key=test-gemini-secret-key"));
    assert.equal(capturedBody.generationConfig?.responseMimeType, "application/json");
    assert.equal(result.answer, "Reforge is an AI engineering intelligence platform.");
    assert.equal(result.confidence, "HIGH");
    assert.equal(result.inferences?.length, 1);
    assert.equal(result.evidence?.[0]?.file, "src/engine.ts");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GeminiProvider: sanitizes API key on error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response("Invalid key test-gemini-secret-key", { status: 403 });
  };

  try {
    const provider = new GeminiProvider({
      apiKey: "test-gemini-secret-key",
    });

    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      (err: Error) => {
        assert.ok(!err.message.includes("test-gemini-secret-key"), "Secret key must not leak in error message");
        assert.ok(err.message.includes("[REDACTED_API_KEY]"), "Secret key should be redacted");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAIProvider: requires valid apiKey", () => {
  assert.throws(() => new OpenAIProvider({ apiKey: "" }), /requires a valid apiKey/);
});

test("OpenAIProvider: generates structured response from successful API call", async () => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders: any;
  let capturedBody: any;

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedHeaders = init?.headers;
    capturedBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: "Analysis shows 5 modules.",
                confidence: "MEDIUM",
                inferences: [],
                evidence: [],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const provider = new OpenAIProvider({
      apiKey: "sk-test-secret-openai-key",
      model: "gpt-4o",
      baseUrl: "https://custom.openai.api/v1",
    });

    const result = await provider.generate({
      system: "System instructions",
      prompt: "Analyze modules",
    });

    assert.equal(capturedHeaders?.Authorization, "Bearer sk-test-secret-openai-key");
    assert.equal(capturedBody.model, "gpt-4o");
    assert.equal(result.answer, "Analysis shows 5 modules.");
    assert.equal(result.confidence, "MEDIUM");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAIProvider: handles plain text fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Plain text answer without JSON structure." } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const provider = new OpenAIProvider({
      apiKey: "sk-test-key",
    });

    const result = await provider.generate({
      system: "sys",
      prompt: "prompt",
    });

    assert.equal(result.answer, "Plain text answer without JSON structure.");
    assert.equal(result.confidence, "MEDIUM");
    assert.deepEqual(result.inferences, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createLLMProvider & getProviderStatus: environment detection", () => {
  // Empty env
  assert.equal(createLLMProvider({}), undefined);
  assert.deepEqual(getProviderStatus(undefined), {
    configured: false,
    provider: null,
    model: null,
  });

  // Gemini auto-detect
  const gemini = createLLMProvider({ GEMINI_API_KEY: "gk-123", GEMINI_MODEL: "gemini-1.5-pro" });
  assert.ok(gemini instanceof GeminiProvider);
  assert.deepEqual(getProviderStatus(gemini), {
    configured: true,
    provider: "gemini",
    model: "gemini-1.5-pro",
  });

  // OpenAI auto-detect
  const openai = createLLMProvider({ OPENAI_API_KEY: "sk-123", OPENAI_MODEL: "gpt-4o-mini" });
  assert.ok(openai instanceof OpenAIProvider);
  assert.deepEqual(getProviderStatus(openai), {
    configured: true,
    provider: "openai",
    model: "gpt-4o-mini",
  });

  // Explicit provider selection
  const selected = createLLMProvider({
    REFORGE_LLM_PROVIDER: "openai",
    GEMINI_API_KEY: "gk-123",
    OPENAI_API_KEY: "sk-123",
  });
  assert.ok(selected instanceof OpenAIProvider);
});

test("GeminiProvider: handles HTTP 429 rate limit with honest error and secret redaction", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ error: { message: "Resource has been exhausted (rate limit)" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const provider = new GeminiProvider({ apiKey: "secret-rate-limit-token" });
    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      (err: Error) => {
        assert.ok(err.message.includes("HTTP 429"));
        assert.ok(!err.message.includes("secret-rate-limit-token"));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GeminiProvider: handles HTTP 500/503 server error gracefully", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response("Internal server error", { status: 503 });
  };

  try {
    const provider = new GeminiProvider({ apiKey: "key-123" });
    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      (err: Error) => {
        assert.ok(err.message.includes("HTTP 503"));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GeminiProvider: handles timeout via AbortSignal", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new Error("The operation was aborted due to timeout"));
      });
    });
  };

  try {
    const provider = new GeminiProvider({ apiKey: "key-123", timeoutMs: 20 });
    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      (err: Error) => {
        assert.ok(err.message.includes("aborted"));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GeminiProvider: rejects empty candidates response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ candidates: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const provider = new GeminiProvider({ apiKey: "key-123" });
    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      /empty or invalid content part/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAIProvider: handles HTTP 429 rate limit and HTTP 500 error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const provider = new OpenAIProvider({ apiKey: "sk-rate-test" });
    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      /HTTP 429/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAIProvider: handles timeout via AbortSignal", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new Error("The operation was aborted due to timeout"));
      });
    });
  };

  try {
    const provider = new OpenAIProvider({ apiKey: "sk-timeout-test", timeoutMs: 20 });
    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      /aborted/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAIProvider: rejects empty choices", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ choices: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const provider = new OpenAIProvider({ apiKey: "sk-empty-test" });
    await assert.rejects(
      provider.generate({ system: "sys", prompt: "prompt" }),
      /empty or invalid message content/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
