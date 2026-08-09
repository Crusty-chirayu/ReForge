import Fastify from "fastify";
import multipart from "@fastify/multipart";
import path from "node:path";
import { z } from "zod";
import { AnalysisEngine } from "./engine.js";
import { cloneRepository, createWorkspace, extractZipSafely, saveUpload } from "./ingestion.js";
import { ProjectBrain } from "./brain.js";
import { PlanningDepartment } from "./planning.js";

const app = Fastify({ logger: true, bodyLimit: 200 * 1024 * 1024 });
const engine = new AnalysisEngine();
const brain = new ProjectBrain();
const planner = new PlanningDepartment();
await app.register(multipart, { limits: { files: 1, fileSize: 200 * 1024 * 1024 } });

app.get("/health", async () => ({ status: "ok", service: "reforge-analysis-engine" }));

app.post("/v1/brain/query", async (request, reply) => {
  const body = z.object({ question: z.string().min(1).max(4_000), report: z.any() }).safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: "Invalid Brain request: question and deterministic report are required." });
  try { return await brain.query(body.data.report, body.data.question); }
  catch (error) { const message = error instanceof Error ? error.message : "Project Brain failed"; return reply.code(message.includes("not configured") ? 503 : 400).send({ error: message }); }
});
app.post("/v1/plan", async (request, reply) => { const body = z.object({ goal: z.string().min(1).max(4_000), report: z.any(), constraints: z.array(z.string()).optional(), priorities: z.array(z.string()).optional(), desiredTechnology: z.string().optional() }).safeParse(request.body); if (!body.success) return reply.code(400).send({ error: "Invalid planning request: goal and deterministic report are required." }); try { return { plan: planner.generate(body.data.report, body.data) }; } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Planning failed" }); } });

app.post("/v1/analyze/repository", async (request, reply) => {
  const body = z.object({ repositoryUrl: z.string().max(2_048) }).safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: "Invalid request body", details: body.error.flatten() });
  const workspace = await createWorkspace();
  try {
    const project = await cloneRepository(body.data.repositoryUrl, workspace.root);
    return await engine.analyze(project, { kind: "repository", reference: body.data.repositoryUrl });
  } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Analysis failed" });
  } finally { await workspace.cleanup(); }
});

app.post("/v1/analyze/archive", async (request, reply) => {
  const part = await request.file();
  if (!part) return reply.code(400).send({ error: "Expected a multipart field named archive." });
  if (!part.filename.toLowerCase().endsWith(".zip")) return reply.code(400).send({ error: "Only .zip archives are accepted." });
  const workspace = await createWorkspace();
  try {
    const archive = await saveUpload(part.file, workspace.root);
    const project = path.join(workspace.root, "project");
    await extractZipSafely(archive, project);
    return await engine.analyze(project, { kind: "archive", reference: part.filename });
  } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Analysis failed" });
  } finally { await workspace.cleanup(); }
});

if (process.env.REFORGE_ENABLE_LOCAL_INGESTION === "true") {
  app.post("/v1/analyze/local", async (request, reply) => {
    const body = z.object({ path: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid request body" });
    try { return await engine.analyze(body.data.path, { kind: "local", reference: body.data.path }); }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "Analysis failed" }); }
  });
}

const port = Number(process.env.PORT ?? 3000);
await app.listen({ host: "127.0.0.1", port });
