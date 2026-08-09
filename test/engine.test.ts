import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AnalysisEngine } from "../src/engine.js";

test("reports only evidence observed in a scanned project", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-test-"));
  try {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { fastify: "^5.0.0", prisma: "^6.0.0" } }));
    await writeFile(path.join(root, "server.ts"), "app.get('/health', () => 'ok'); // TODO protect with jwt");
    await writeFile(path.join(root, "LICENSE"), "MIT");
    const report = await new AnalysisEngine().analyze(root, { kind: "local", reference: root });
    assert.ok(report.languages.some((item) => item.name === "TypeScript"));
    assert.ok(report.frameworks.some((item) => item.name === "fastify"));
    assert.ok(report.apiHints.length > 0);
    assert.ok(report.databaseHints.length > 0);
    assert.ok(report.provenance.licenses.some((item) => item.file === "LICENSE"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("does not analyze ignored generated and repository directories", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-test-"));
  try {
    await mkdir(path.join(root, "node_modules"));
    await mkdir(path.join(root, ".git"));
    await mkdir(path.join(root, "dist"));
    await mkdir(path.join(root, "build"));
    await mkdir(path.join(root, ".cache"));
    await writeFile(path.join(root, "node_modules", "hidden.ts"), "const ignored: string = 'ignored';");
    await writeFile(path.join(root, "app.js"), "console.log('analyze me');");
    const report = await new AnalysisEngine().analyze(root, { kind: "local" });
    assert.equal(report.overview.fileCount, 1);
    assert.ok(report.structure.ignoredDirectories.includes("node_modules"));
    assert.ok(report.structure.ignoredDirectories.includes(".git"));
    assert.ok(report.structure.ignoredDirectories.includes("dist"));
    assert.ok(report.structure.ignoredDirectories.includes("build"));
    assert.ok(report.structure.ignoredDirectories.includes(".cache"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("reports malformed package manifests as an evidence-backed observation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-test-"));
  try {
    await writeFile(path.join(root, "package.json"), "{ not valid JSON");
    const report = await new AnalysisEngine().analyze(root, { kind: "local" });
    assert.ok(report.codeQualityObservations.some((item) => item.name === "Malformed package manifest" && item.evidence[0]?.file === "package.json"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
