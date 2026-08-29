// ─────────────────────────────────────────────────────────────────────────────
// F10 release audit.
//
// These tests guard the release contract itself rather than any single screen:
// the API paths must keep matching the frozen backend, query parameters must
// stay inside the bounds the backend accepts, the shipped configuration must
// not leak secrets or build artifacts, and the documentation the release
// depends on must exist.
//
// They read real files from disk on purpose — a passing unit test against a
// mock would not catch a committed `.env` or a stale README.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { API_PATHS, apiPath, ENDPOINT_INVENTORY } from "@/lib/api/endpoints";
import { MAX_ARCHIVE_BYTES } from "@/lib/utils/archive";

const FRONTEND_ROOT = join(__dirname, "..", "..");
const SRC = join(FRONTEND_ROOT, "src");

function read(relative: string): string {
  return readFileSync(join(FRONTEND_ROOT, relative), "utf8");
}

/** Every source file under src/, excluding the test tree. */
function sourceFiles(dir: string = SRC, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "test") continue;
      sourceFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const SOURCE_FILES = sourceFiles();
const SOURCE_TEXT = SOURCE_FILES.map((f) => readFileSync(f, "utf8")).join("\n");

/** Source with comments removed, so prose about an API is not mistaken for a call. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SOURCE_CODE = SOURCE_FILES.map((f) =>
  stripComments(readFileSync(f, "utf8")),
).join("\n");

// ─────────────────────────────────────────────────────────────────────────────
// 1. API contract — paths mirror the frozen backend (src/server.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe("API contract: paths mirror the frozen backend", () => {
  // Transcribed from src/server.ts at the frozen backend commit 0507a7e.
  const BACKEND_ROUTES = [
    "GET /health",
    "POST /v1/analyze/archive",
    "POST /v1/analyze/repository",
    "POST /v1/analyze/local",
    "POST /v1/snapshot",
    "POST /v1/brain/query",
    "POST /v1/plan",
    "POST /v1/novelty",
    "POST /v1/impact",
    "POST /v1/build",
    "POST /v1/execute",
    "POST /v1/execute/validate",
    "POST /v1/pipeline",
    "GET /v1/pipeline/history",
    "GET /v1/pipeline/:id",
    "GET /v1/snapshot/:id",
    "GET /v1/snapshot/:id/intelligence",
    "GET /v1/snapshots/:beforeId/compare/:afterId",
    "GET /v1/project/history",
  ];

  const backendPaths = new Set(BACKEND_ROUTES.map((r) => r.split(" ")[1]));

  it("declares no endpoint the backend does not serve", () => {
    for (const path of Object.values(API_PATHS)) {
      expect(backendPaths.has(path), `unknown backend path: ${path}`).toBe(true);
    }
  });

  it("builds parameterized paths that match the backend's shapes", () => {
    expect(apiPath.pipelineDetail("abc")).toBe("/v1/pipeline/abc");
    expect(apiPath.snapshotDetail("abc")).toBe("/v1/snapshot/abc");
    expect(apiPath.snapshotIntelligence("abc")).toBe(
      "/v1/snapshot/abc/intelligence",
    );
    expect(apiPath.snapshotCompare("a", "b")).toBe("/v1/snapshots/a/compare/b");
  });

  it("percent-encodes identifiers so a hostile id cannot escape its path segment", () => {
    expect(apiPath.snapshotDetail("../../etc/passwd")).not.toContain("../");
    expect(apiPath.pipelineDetail("a/b")).toBe("/v1/pipeline/a%2Fb");
    expect(apiPath.snapshotCompare("a b", "c?d")).toBe(
      "/v1/snapshots/a%20b/compare/c%3Fd",
    );
  });

  it("keeps the displayed endpoint inventory truthful", () => {
    for (const entry of ENDPOINT_INVENTORY) {
      const concrete = entry.path
        .replace(":beforeId", "x")
        .replace(":afterId", "y")
        .replace(/:a\b/, "x")
        .replace(/:b\b/, "y")
        .replace(/:id/g, "x");
      const matches = BACKEND_ROUTES.some((route) => {
        const [method, path] = route.split(" ");
        if (method !== entry.method) return false;
        const routeConcrete = path!
          .replace(":beforeId", "x")
          .replace(":afterId", "y")
          .replace(/:id/g, "x");
        return routeConcrete === concrete;
      });
      expect(matches, `inventory lists unknown route: ${entry.method} ${entry.path}`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. API contract — query parameters stay inside backend-accepted bounds
// ─────────────────────────────────────────────────────────────────────────────

describe("API contract: query parameter bounds", () => {
  // Backend zod bounds at 0507a7e:
  //   /v1/project/history   limit        int 1..100 (default 20)
  //   /v1/pipeline/history  limit        int 1..200 (default 50)
  //   /v1/snapshot/:id/intelligence historyLimit int 1..50 (default 10)
  const BOUNDS = {
    projectHistory: { min: 1, max: 100 },
    pipelineHistory: { min: 1, max: 200 },
    snapshotIntelligence: { min: 1, max: 50 },
  };

  it("omits the limit entirely when unspecified, deferring to backend defaults", () => {
    expect(apiPath.projectHistory()).toBe("/v1/project/history");
    expect(apiPath.pipelineHistory()).toBe("/v1/pipeline/history");
  });

  it("emits limits the backend will accept", () => {
    expect(apiPath.projectHistory(BOUNDS.projectHistory.max)).toBe(
      "/v1/project/history?limit=100",
    );
    expect(apiPath.pipelineHistory(BOUNDS.pipelineHistory.max)).toBe(
      "/v1/pipeline/history?limit=200",
    );
  });

  it("never requests a limit outside the backend's accepted range", () => {
    const callSites = [
      { file: "src/app/page.tsx", pattern: /useProjectHistory\((\d+)\)/g, bound: BOUNDS.projectHistory },
      { file: "src/app/page.tsx", pattern: /usePipelineHistory\((\d+)\)/g, bound: BOUNDS.pipelineHistory },
      { file: "src/app/snapshots/page.tsx", pattern: /useProjectHistory\((\d+)\)/g, bound: BOUNDS.projectHistory },
      {
        file: "src/app/snapshot/[snapshotId]/page.tsx",
        pattern: /useSnapshotIntelligence\([^,)]+,\s*(\d+)\)/g,
        bound: BOUNDS.snapshotIntelligence,
      },
    ];

    let checked = 0;
    for (const site of callSites) {
      const text = read(site.file);
      for (const match of text.matchAll(site.pattern)) {
        const value = Number(match[1]);
        expect(value, `${site.file}: ${match[0]}`).toBeGreaterThanOrEqual(site.bound.min);
        expect(value, `${site.file}: ${match[0]}`).toBeLessThanOrEqual(site.bound.max);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Security — nothing dangerous ships in the bundle
// ─────────────────────────────────────────────────────────────────────────────

describe("Security: shipped source", () => {
  it("never injects raw HTML", () => {
    expect(SOURCE_CODE).not.toContain("dangerouslySetInnerHTML");
    expect(SOURCE_CODE).not.toContain("innerHTML");
    expect(SOURCE_CODE).not.toContain("document.write");
  });

  it("never evaluates strings as code", () => {
    expect(SOURCE_CODE).not.toMatch(/\beval\s*\(/);
    expect(SOURCE_CODE).not.toMatch(/new\s+Function\s*\(/);
  });

  it("never reaches for filesystem or shell APIs from the browser bundle", () => {
    for (const file of SOURCE_FILES) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/from\s+["']node:(fs|child_process)["']/);
      expect(text, file).not.toMatch(/require\(\s*["'](fs|child_process)["']\s*\)/);
    }
  });

  it("contains no hard-coded credentials", () => {
    // Deliberately excludes analysis *findings* about secrets, which are data
    // the backend returns and the console must be able to render.
    expect(SOURCE_TEXT).not.toMatch(/sk-[a-zA-Z0-9]{16,}/);
    expect(SOURCE_TEXT).not.toMatch(/(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"'{}\s]{12,}["']/i);
    expect(SOURCE_TEXT).not.toMatch(/Authorization:\s*["']Bearer\s+\S/i);
  });

  it("only reads browser-safe environment variables on the client", () => {
    const clientEnvRefs = SOURCE_FILES.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      if (!text.includes('"use client"')) return [];
      return [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]!);
    });
    for (const name of clientEnvRefs) {
      expect(
        name.startsWith("NEXT_PUBLIC_") || name === "NODE_ENV",
        `client component reads non-public env var: ${name}`,
      ).toBe(true);
    }
  });

  it("sends credentials same-origin only", () => {
    const client = read("src/lib/api/client.ts");
    expect(client).toContain('credentials: "same-origin"');
    expect(client).not.toContain('credentials: "include"');
  });

  it("never uses persistent browser storage for analysis data", () => {
    // localStorage and cookies outlive the tab; an analysis report can describe
    // private source code, so neither is ever acceptable here.
    expect(SOURCE_CODE).not.toMatch(/localStorage/);
    expect(SOURCE_CODE).not.toMatch(/document\.cookie/);
  });

  it("confines per-tab sessionStorage to the report store, guarded and validated", () => {
    const users = SOURCE_FILES.filter((file) =>
      readFileSync(file, "utf8").includes("sessionStorage.getItem"),
    );
    expect(users.map((f) => f.replace(SRC, "src"))).toEqual([
      join("src", "lib", "context", "report-context.tsx"),
    ]);

    const store = read("src/lib/context/report-context.tsx");
    // Reads must tolerate private mode / quota errors instead of throwing.
    expect(store).toMatch(/try\s*\{[\s\S]*sessionStorage[\s\S]*\}\s*catch/);
    // Stored payloads are untrusted input: validate before adopting them.
    expect(store).toContain("schemaVersion");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Production configuration
// ─────────────────────────────────────────────────────────────────────────────

describe("Production configuration", () => {
  it("ships an env template with placeholders and no real values", () => {
    expect(existsSync(join(FRONTEND_ROOT, ".env.example"))).toBe(true);
    const example = read(".env.example");
    expect(example).toContain("REFORGE_BACKEND_URL");
    expect(example).toContain("NEXT_PUBLIC_API_URL");
    expect(example).not.toMatch(/sk-[a-zA-Z0-9]{16,}/);
    expect(example).not.toMatch(/=\s*["']?[A-Za-z0-9_\-]{32,}["']?\s*$/m);
  });

  it("commits no real env file", () => {
    for (const name of [".env", ".env.local", ".env.production", ".env.development"]) {
      expect(existsSync(join(FRONTEND_ROOT, name)), `${name} must not be committed`).toBe(false);
    }
  });

  it("ignores build artifacts, dependencies, and env files", () => {
    const ignore = read(".gitignore");
    for (const pattern of ["node_modules/", ".next/", ".env", ".env.local", "coverage/"]) {
      expect(ignore, `missing .gitignore entry: ${pattern}`).toContain(pattern);
    }
  });

  it("exposes the exact scripts the release gates depend on", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.build).toBe("next build");
    expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.scripts.lint).toContain("--max-warnings=0");
    expect(pkg.scripts.start).toBe("next start");
  });

  it("proxies the backend through same-origin rewrites with an overridable origin", () => {
    const config = read("next.config.ts");
    expect(config).toContain("REFORGE_BACKEND_URL");
    expect(config).toContain("/v1/:path*");
    expect(config).toContain("/health");
    expect(config).toContain("poweredByHeader: false");
  });

  it("buffers proxied request bodies up to the full archive limit", async () => {
    // Regression guard. The rewrite proxy buffers request bodies in memory and
    // defaults to 10 MB. Exceeding that does not fail loudly — Next.js forwards
    // a truncated body, cutting the multipart stream mid-file, and the backend
    // hangs up the socket (ECONNRESET). Any archive over 10 MB was unusable.
    const { default: config } = (await import("../../next.config")) as {
      default: { experimental?: { proxyClientMaxBodySize?: number | string } };
    };

    const limit = config.experimental?.proxyClientMaxBodySize;
    expect(limit, "proxy body limit must be configured").toBeDefined();
    // Must match the archive contract exactly, so the proxy never becomes the
    // component that rejects an upload the backend would have accepted.
    expect(limit).toBe(MAX_ARCHIVE_BYTES);
    expect(limit).toBeGreaterThan(10 * 1024 * 1024);
  });

  it("hard-codes no absolute developer paths", () => {
    for (const file of SOURCE_FILES) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/\/home\/[a-z]+\//i);
      expect(text, file).not.toMatch(/[A-Z]:\\Users\\/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Release documentation
// ─────────────────────────────────────────────────────────────────────────────

describe("Release documentation", () => {
  it("documents every topic an operator needs to run the console", () => {
    expect(existsSync(join(FRONTEND_ROOT, "README.md"))).toBe(true);
    const readme = read("README.md").toLowerCase();
    for (const topic of [
      "architecture boundary",
      "frontend architecture",
      "directory structure",
      "installation",
      "running the backend",
      "running the frontend",
      "environment variables",
      "api proxy",
      "routes",
      "testing",
      "production build",
      "known limitations",
      "backend freeze",
    ]) {
      expect(readme, `README missing topic: ${topic}`).toContain(topic);
    }
  });

  it("documents both environment variables and warns that NEXT_PUBLIC_ is public", () => {
    const readme = read("README.md");
    expect(readme).toContain("REFORGE_BACKEND_URL");
    expect(readme).toContain("NEXT_PUBLIC_API_URL");
    expect(readme.toLowerCase()).toMatch(/never (hold|place) a secret|publicly readable/);
  });

  it("records the frozen backend commit so the boundary is auditable", () => {
    expect(read("README.md")).toContain("0507a7e");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Route inventory — the filesystem is the source of truth
// ─────────────────────────────────────────────────────────────────────────────

describe("Route inventory", () => {
  function routes(dir: string, prefix = ""): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      const segment = `${prefix}/${entry}`;
      if (existsSync(join(full, "page.tsx"))) found.push(segment);
      found.push(...routes(full, segment));
    }
    return found;
  }

  const APP = join(SRC, "app");
  const all = [
    ...(existsSync(join(APP, "page.tsx")) ? ["/"] : []),
    ...routes(APP),
  ].sort();

  it("contains exactly the 14 released routes", () => {
    expect(all).toEqual(
      [
        "/",
        "/analyze",
        "/analyze/report",
        "/brain",
        "/build",
        "/impact",
        "/novelty",
        "/pipeline",
        "/pipeline/[pipelineId]",
        "/pipeline/new",
        "/plan",
        "/snapshot/[snapshotId]",
        "/snapshot/compare/[beforeId]/[afterId]",
        "/snapshots",
      ].sort(),
    );
    expect(all).toHaveLength(14);
  });

  it("has no duplicate route paths", () => {
    expect(new Set(all).size).toBe(all.length);
  });

  it("provides an app-level 404 and error boundary", () => {
    expect(existsSync(join(APP, "not-found.tsx"))).toBe(true);
    expect(existsSync(join(APP, "error.tsx"))).toBe(true);
  });

  it("never leaks a stack trace or server path through the error boundary", () => {
    const boundary = read("src/app/error.tsx");
    expect(boundary).not.toMatch(/error\.stack/);
    expect(boundary).toContain("digest");
  });

  it("routes /pipeline to the real entry point instead of dead-ending", () => {
    const index = read("src/app/pipeline/page.tsx");
    expect(index).toContain("redirect");
    expect(index).toContain("/pipeline/new");
  });
});
