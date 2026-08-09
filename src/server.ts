import Fastify from "fastify";
import multipart from "@fastify/multipart";
import path from "node:path";
import { z } from "zod";
import type { BuildRequest, ExecutionRequest } from "./domain.js";
import { AnalysisEngine } from "./engine.js";
import {
  cloneRepository,
  createWorkspace,
  extractZipSafely,
  saveUpload,
} from "./ingestion.js";
import { ProjectBrain } from "./brain.js";
import { PlanningDepartment } from "./planning.js";
import { NoveltyEngine } from "./novelty.js";
import { analyzeImpact } from "./impact.js";
import { ReforgeBuilder } from "./builder.js";
import { executePatchesInWorkspace, validateExecution } from "./execution.js";
import { createProjectSnapshot } from "./snapshot.js";
import { runPipeline } from "./pipeline.js";
import { StateStore } from "./state-store.js";
import { compareSnapshots } from "./snapshot-diff.js";
import {
  generateHistoricalIntelligence,
  getProjectHistoryTimeline,
} from "./historical-intelligence.js";


const app = Fastify({
  logger: process.env.NODE_ENV !== "test" && process.env.REFORGE_SKIP_LISTEN !== "true",
  bodyLimit: 200 * 1024 * 1024,
});

const engine = new AnalysisEngine();
const brain = new ProjectBrain();
const planner = new PlanningDepartment();
const novelty = new NoveltyEngine();
const builder = new ReforgeBuilder();
const store = new StateStore();


await app.register(multipart, {
  limits: {
    files: 1,
    fileSize: 200 * 1024 * 1024,
  },
});

app.get("/health", async () => ({
  status: "ok",
  service: "reforge-analysis-engine",
}));

app.post("/v1/brain/query", async (request, reply) => {
  const body = z
    .object({
      question: z.string().min(1).max(4_000),
      report: z.any(),
    })
    .safeParse(request.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({
        error:
          "Invalid Brain request: question and deterministic report are required.",
      });
  }

  try {
    return await brain.query(body.data.report, body.data.question);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Project Brain failed";

    return reply
      .code(message.includes("not configured") ? 503 : 400)
      .send({ error: message });
  }
});

app.post("/v1/plan", async (request, reply) => {
  const body = z
    .object({
      goal: z.string().min(1).max(4_000),
      report: z.any(),
      constraints: z.array(z.string()).optional(),
      priorities: z.array(z.string()).optional(),
      desiredTechnology: z.string().optional(),
    })
    .safeParse(request.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({
        error:
          "Invalid planning request: goal and deterministic report are required.",
      });
  }

  try {
    return {
      plan: planner.generate(body.data.report, body.data),
    };
  } catch (error) {
    return reply
      .code(400)
      .send({
        error: error instanceof Error ? error.message : "Planning failed",
      });
  }
});

app.post("/v1/novelty", async (request, reply) => {
  const body = z
    .object({
      goal: z.string().max(4_000).optional(),
      report: z.any(),
    })
    .safeParse(request.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({
        error: "Invalid novelty request: deterministic report is required.",
      });
  }

  try {
    return {
      novelty: novelty.generate({
        goal: body.data.goal,
        report: body.data.report,
      }),
    };
  } catch (error) {
    return reply
      .code(400)
      .send({
        error:
          error instanceof Error ? error.message : "Novelty analysis failed",
      });
  }
});

app.post("/v1/impact", async (request, reply) => {
  const body = z
    .object({
      request: z.string().min(1).max(4_000),
      report: z.any(),
      category: z.string().optional(),
    })
    .safeParse(request.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({
        error:
          "Invalid impact request: request and deterministic report are required.",
      });
  }

  return analyzeImpact(body.data.report, {
    request: body.data.request,
    category: body.data.category as any,
  });
});

app.post("/v1/build", async (request, reply) => {
  const body = z
    .object({
      goal: z.string().min(1),
      report: z
        .object({
          provenance: z.object({
            source: z.object({
              kind: z.string(),
            }),
            licenses: z.array(z.any()),
            copyrightNotices: z.array(z.any()),
          }),
          projectModel: z.object({
            modules: z.array(
              z.object({
                id: z.string(),
              }),
            ),
          }),
        })
        .passthrough(),
      impact: z.any().optional(),
      noveltyCandidate: z.any().optional(),
      plan: z.any().optional(),
    })
    .safeParse(request.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({
        error:
          "Invalid build request: goal plus deterministic report provenance and project model are required.",
      });
  }

  return {
    build: builder.generate({
      goal: body.data.goal,
      report: body.data.report as unknown as BuildRequest["report"],
      impact: body.data.impact,
      noveltyCandidate: body.data.noveltyCandidate,
      plan: body.data.plan,
    }),
  };
});

/*
 * Phase 9B
 *
 * Trusted isolated execution preparation.
 *
 * The client supplies:
 *   - a trusted ZIP archive
 *   - an execution JSON request
 *
 * The client does NOT supply:
 *   - a filesystem path
 *   - a workspace path
 *   - an authoritative snapshot
 *
 * ReForge creates the workspace and snapshot itself.
 *
 * IMPORTANT:
 * This endpoint currently validates the approved patch set.
 * It does NOT yet apply filesystem mutations.
 */
app.post("/v1/execute", async (request, reply) => {
  const workspace = await createWorkspace();

  try {
    let archivePart: Awaited<ReturnType<typeof request.file>> | undefined;
    let executionPayload: unknown;

    /*
     * Read multipart fields.
     *
     * Expected fields:
     *
     * archive  -> .zip file
     * request  -> JSON execution request
     */
    for await (const part of request.parts()) {
      if (part.type === "file") {
        if (part.fieldname !== "archive") {
          part.file.resume();
          return reply
            .code(400)
            .send({
              error:
                "Only the multipart file field named 'archive' is accepted.",
            });
        }

        if (!part.filename.toLowerCase().endsWith(".zip")) {
          part.file.resume();
          return reply
            .code(400)
            .send({
              error: "Only .zip archives are accepted for execution.",
            });
        }

        if (archivePart) {
          part.file.resume();
          return reply
            .code(400)
            .send({
              error: "Only one execution archive is allowed.",
            });
        }

        archivePart = part;
      } else {
        if (part.fieldname === "request") {
          try {
            if (typeof part.value !== "string") {
  return reply
    .code(400)
    .send({
      error: "The 'request' field must contain a JSON string.",
    });
}

try {
  executionPayload = JSON.parse(part.value);
} catch {
  return reply
    .code(400)
    .send({
      error: "The 'request' field must contain valid JSON.",
    });
}
          } catch {
            return reply
              .code(400)
              .send({
                error: "The 'request' field must contain valid JSON.",
              });
          }
        }
      }
    }

    if (!archivePart) {
      return reply
        .code(400)
        .send({
          error:
            "Expected a multipart .zip field named 'archive'.",
        });
    }

    if (!executionPayload) {
      return reply
        .code(400)
        .send({
          error:
            "Expected a JSON field named 'request' containing the execution request.",
        });
    }

    /*
     * Validate the client-controlled portion of the request.
     *
     * Reject any client attempt to supply executable, command, shell, args, cwd, or env overrides.
     */
    if (
      typeof executionPayload === "object" &&
      executionPayload !== null &&
      ("command" in executionPayload ||
        "shell" in executionPayload ||
        "exec" in executionPayload ||
        "args" in executionPayload ||
        "cwd" in executionPayload ||
        "script" in executionPayload ||
        "env" in executionPayload)
    ) {
      return reply.code(400).send({
        error:
          "Arbitrary executable, command, shell, args, cwd, or environment overrides are not permitted.",
      });
    }

    const parsedRequest = z
      .object({
        approved: z.boolean(),
        build: z.any(),
        patches: z.array(z.any()).optional(),
        allowDelete: z.boolean().optional(),
        verify: z.boolean().optional(),
      })
      .safeParse(executionPayload);

    if (!parsedRequest.success) {
      return reply
        .code(400)
        .send({
          error:
            "Invalid execution request. approved and build are required.",
          details: parsedRequest.error.flatten(),
        });
    }

    /*
     * Store the uploaded archive inside the server-controlled workspace.
     */
    const archive = await saveUpload(
      archivePart.file,
      workspace.root,
    );

    /*
     * Extract using the existing safe ZIP boundary.
     *
     * This preserves:
     * - traversal protection
     * - symlink rejection
     * - file-count limits
     * - size limits
     * - controlled extraction
     */
    const project = path.join(
      workspace.root,
      "project",
    );

    await extractZipSafely(
      archive,
      project,
    );

    /*
     * Analyze the trusted extracted workspace.
     */
    const report = await engine.analyze(
      project,
      {
        kind: "archive",
        reference: archivePart.filename,
      },
    );

    /*
     * Generate the authoritative server-controlled snapshot.
     *
     * The client cannot replace this snapshot.
     */
    const snapshot = await createProjectSnapshot(
      project,
      report,
    );

    /*
     * Construct the actual ExecutionRequest.
     *
     * Snapshot and snapshotId come ONLY from the server-generated
     * snapshot.
     */
    const executionRequest: ExecutionRequest = {
      approved: parsedRequest.data.approved,
      build: parsedRequest.data.build,
      patches: parsedRequest.data.patches,
      allowDelete: parsedRequest.data.allowDelete,
      verify: parsedRequest.data.verify,
      snapshotId: snapshot.snapshotId,
      snapshot,
    };

    /*
     * Execute isolated patch operations inside the disposable workspace.
     */
    let cleanupStatus: "SUCCESS" | "FAILED" = "SUCCESS";
    let receipt;
    try {
      receipt = await executePatchesInWorkspace(
        project,
        executionRequest,
      );
    } finally {
      try {
        await workspace.cleanup();
      } catch {
        cleanupStatus = "FAILED";
      }
    }

    if (receipt) {
      receipt.workspaceCleanupStatus = cleanupStatus;
    }

    return {
      execution: receipt,
      receipt,
      snapshot: {
        snapshotId: snapshot.snapshotId,
        provenance: snapshot.provenance,
        fileCount: snapshot.files.length,
        projectModelFingerprint:
          snapshot.projectModelFingerprint,
      },
    };
  } catch (error) {
    try {
      await workspace.cleanup();
    } catch {}

    return reply
      .code(400)
      .send({
        error:
          error instanceof Error
            ? error.message
            : "Execution failed",
      });
  }
});

/*
 * Phase 10
 *
 * End-to-End Autonomous Engineering Pipeline endpoint.
 *
 * Client supplies:
 *   - multipart archive (.zip)
 *   - JSON string in request field containing PipelineRequest:
 *     { goal: string, approved: boolean, allowDelete?: boolean, verify?: boolean }
 *
 * Client is REJECTED if supplying:
 *   - command, shell, exec, args, cwd, script, env overrides
 */
app.post("/v1/pipeline", async (request, reply) => {
  const workspace = await createWorkspace();

  try {
    let archivePart: Awaited<ReturnType<typeof request.file>> | undefined;
    let pipelinePayload: unknown;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        if (part.fieldname !== "archive") {
          part.file.resume();
          return reply.code(400).send({
            error: "Only the multipart file field named 'archive' is accepted.",
          });
        }

        if (!part.filename.toLowerCase().endsWith(".zip")) {
          part.file.resume();
          return reply.code(400).send({
            error: "Only .zip archives are accepted for pipeline execution.",
          });
        }

        if (archivePart) {
          part.file.resume();
          return reply.code(400).send({
            error: "Only one pipeline execution archive is allowed.",
          });
        }

        archivePart = part;
      } else {
        if (part.fieldname === "request") {
          if (typeof part.value !== "string") {
            return reply.code(400).send({
              error: "The 'request' field must contain a JSON string.",
            });
          }

          try {
            pipelinePayload = JSON.parse(part.value);
          } catch {
            return reply.code(400).send({
              error: "The 'request' field must contain valid JSON.",
            });
          }
        }
      }
    }

    if (!archivePart) {
      return reply.code(400).send({
        error: "Expected a multipart .zip field named 'archive'.",
      });
    }

    if (!pipelinePayload) {
      return reply.code(400).send({
        error: "Expected a JSON field named 'request' containing the pipeline request.",
      });
    }

    if (
      typeof pipelinePayload === "object" &&
      pipelinePayload !== null &&
      ("command" in pipelinePayload ||
        "shell" in pipelinePayload ||
        "exec" in pipelinePayload ||
        "args" in pipelinePayload ||
        "cwd" in pipelinePayload ||
        "script" in pipelinePayload ||
        "env" in pipelinePayload)
    ) {
      return reply.code(400).send({
        error: "Arbitrary executable, command, shell, args, cwd, or environment overrides are not permitted.",
      });
    }

    const parsedRequest = z
      .object({
        goal: z.string().min(1).max(4_000),
        approved: z.boolean(),
        allowDelete: z.boolean().optional(),
        verify: z.boolean().optional(),
      })
      .safeParse(pipelinePayload);

    if (!parsedRequest.success) {
      return reply.code(400).send({
        error: "Invalid pipeline request: goal and approved are required.",
        details: parsedRequest.error.flatten(),
      });
    }

    const archive = await saveUpload(archivePart.file, workspace.root);
    const project = path.join(workspace.root, "project");
    await extractZipSafely(archive, project);

    let cleanupStatus: "SUCCESS" | "FAILED" = "SUCCESS";
    let result;
    try {
      result = await runPipeline(project, parsedRequest.data, {
        kind: "archive",
        reference: archivePart.filename,
      });
    } finally {
      try {
        await workspace.cleanup();
      } catch {
        cleanupStatus = "FAILED";
      }
    }

    if (result) {
      result.workspaceCleanupStatus = cleanupStatus;
      await store
        .appendAuditEvent({
          pipelineId: result.pipelineId,
          eventType: "CLEANED_UP",
          details: { workspaceCleanupStatus: cleanupStatus },
        })
        .catch(() => {});
    }

    return {
      pipeline: result,
      result,
    };
  } catch (error) {
    try {
      await workspace.cleanup();
    } catch {}

    return reply.code(400).send({
      error: error instanceof Error ? error.message : "Pipeline execution failed",
    });
  }
});

/*
 * Phase 11 Query Endpoints
 */

app.get("/v1/pipeline/history", async (request, reply) => {
  const query = z
    .object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .safeParse(request.query);

  if (!query.success) {
    return reply.code(400).send({
      error: "Invalid limit parameter. Limit must be an integer between 1 and 200.",
    });
  }

  const limit = query.data.limit ?? 50;
  const history = await store.listExecutions(limit);

  return {
    history,
    limit,
    count: history.length,
  };
});

app.get("/v1/pipeline/:pipelineId", async (request, reply) => {
  const params = request.params as { pipelineId?: string };
  const pipelineId = params.pipelineId;

  if (!pipelineId || typeof pipelineId !== "string") {
    return reply.code(400).send({ error: "Pipeline ID is required." });
  }

  try {
    const execution = await store.getExecution(pipelineId);
    if (!execution) {
      return reply.code(404).send({ error: "Execution receipt not found." });
    }
    return { execution, result: execution };
  } catch {
    return reply.code(404).send({ error: "Execution receipt not found." });
  }
});

app.get("/v1/snapshot/:snapshotId", async (request, reply) => {
  const params = request.params as { snapshotId?: string };
  const snapshotId = params.snapshotId;

  if (!snapshotId || typeof snapshotId !== "string") {
    return reply.code(400).send({ error: "Snapshot ID is required." });
  }

  try {
    const snapshot = await store.getSnapshot(snapshotId);
    if (!snapshot) {
      return reply.code(404).send({ error: "Snapshot not found." });
    }
    return { snapshot };
  } catch {
    return reply.code(404).send({ error: "Snapshot not found." });
  }
});

/*
 * Phase 12 Query Endpoints
 */

app.get("/v1/snapshots/:beforeId/compare/:afterId", async (request, reply) => {
  const params = request.params as { beforeId?: string; afterId?: string };
  const { beforeId, afterId } = params;

  if (!beforeId || !afterId || typeof beforeId !== "string" || typeof afterId !== "string") {
    return reply.code(400).send({ error: "Both beforeId and afterId parameters are required." });
  }

  const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
  if (
    !ID_REGEX.test(beforeId) ||
    !ID_REGEX.test(afterId) ||
    beforeId.includes("..") ||
    afterId.includes("..")
  ) {
    return reply.code(400).send({ error: "Invalid snapshot ID format." });
  }

  try {
    const before = await store.getSnapshot(beforeId);
    const after = await store.getSnapshot(afterId);

    if (!before || !after) {
      return reply.code(404).send({ error: "One or both requested snapshots were not found." });
    }

    const diff = compareSnapshots(before, after);
    return { diff };
  } catch {
    return reply.code(404).send({ error: "Snapshot comparison failed." });
  }
});

app.get("/v1/snapshot/:snapshotId/intelligence", async (request, reply) => {
  const params = request.params as { snapshotId?: string };
  const snapshotId = params.snapshotId;

  if (!snapshotId || typeof snapshotId !== "string") {
    return reply.code(400).send({ error: "Snapshot ID is required." });
  }

  const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
  if (!ID_REGEX.test(snapshotId) || snapshotId.includes("..")) {
    return reply.code(400).send({ error: "Invalid snapshot ID format." });
  }

  const query = z
    .object({
      historyLimit: z.coerce.number().int().min(1).max(50).optional(),
    })
    .safeParse(request.query);

  if (!query.success) {
    return reply.code(400).send({
      error: "Invalid historyLimit parameter. Must be an integer between 1 and 50.",
    });
  }

  const historyLimit = query.data.historyLimit ?? 10;

  try {
    const intelligence = await generateHistoricalIntelligence(
      snapshotId,
      store,
      historyLimit,
    );
    return { intelligence };
  } catch (error) {
    return reply.code(404).send({
      error: error instanceof Error ? error.message : "Snapshot intelligence failed.",
    });
  }
});

app.get("/v1/project/history", async (request, reply) => {
  const query = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
    .safeParse(request.query);

  if (!query.success) {
    return reply.code(400).send({
      error: "Invalid limit parameter. Limit must be an integer between 1 and 100.",
    });
  }

  const limit = query.data.limit ?? 20;
  const history = await getProjectHistoryTimeline(store, limit);

  return {
    history,
    limit,
    count: history.length,
  };
});

/*
 * Existing Phase 9 validation endpoint.



 *
 * Kept for backward compatibility.
 * This endpoint remains validation-only and accepts a
 * previously generated snapshot explicitly.
 */
app.post("/v1/execute/validate", async (request, reply) => {
  const body = z
    .object({
      snapshotId: z.string().optional(),
      snapshot: z.any().optional(),
      build: z.any(),
      patches: z.array(z.any()).optional(),
      approved: z.boolean(),
      allowDelete: z.boolean().optional(),
    })
    .safeParse(request.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({
        error: "Invalid execution request.",
      });
  }

  return validateExecution(
    body.data as ExecutionRequest,
  );
});

app.post("/v1/snapshot", async (request, reply) => {
  const part = await request.file();

  if (
    !part ||
    !part.filename.toLowerCase().endsWith(".zip")
  ) {
    return reply
      .code(400)
      .send({
        error:
          "Expected a multipart .zip field named archive.",
      });
  }

  const workspace = await createWorkspace();

  try {
    const archive = await saveUpload(
      part.file,
      workspace.root,
    );

    const project = path.join(
      workspace.root,
      "project",
    );

    await extractZipSafely(
      archive,
      project,
    );

    const report = await engine.analyze(
      project,
      {
        kind: "archive",
        reference: part.filename,
      },
    );

    return {
      snapshot: await createProjectSnapshot(
        project,
        report,
      ),
    };
  } catch (error) {
    return reply
      .code(400)
      .send({
        error:
          error instanceof Error
            ? error.message
            : "Snapshot creation failed",
      });
  } finally {
    await workspace.cleanup();
  }
});

app.post("/v1/analyze/repository", async (request, reply) => {
  const body = z
    .object({
      repositoryUrl: z.string().max(2_048),
    })
    .safeParse(request.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({
        error: "Invalid request body",
        details: body.error.flatten(),
      });
  }

  const workspace = await createWorkspace();

  try {
    const project = await cloneRepository(
      body.data.repositoryUrl,
      workspace.root,
    );

    return await engine.analyze(
      project,
      {
        kind: "repository",
        reference: body.data.repositoryUrl,
      },
    );
  } catch (error) {
    return reply
      .code(400)
      .send({
        error:
          error instanceof Error
            ? error.message
            : "Analysis failed",
      });
  } finally {
    await workspace.cleanup();
  }
});

app.post("/v1/analyze/archive", async (request, reply) => {
  const part = await request.file();

  if (!part) {
    return reply
      .code(400)
      .send({
        error:
          "Expected a multipart field named archive.",
      });
  }

  if (!part.filename.toLowerCase().endsWith(".zip")) {
    return reply
      .code(400)
      .send({
        error: "Only .zip archives are accepted.",
      });
  }

  const workspace = await createWorkspace();

  try {
    const archive = await saveUpload(
      part.file,
      workspace.root,
    );

    const project = path.join(
      workspace.root,
      "project",
    );

    await extractZipSafely(
      archive,
      project,
    );

    return await engine.analyze(
      project,
      {
        kind: "archive",
        reference: part.filename,
      },
    );
  } catch (error) {
    return reply
      .code(400)
      .send({
        error:
          error instanceof Error
            ? error.message
            : "Analysis failed",
      });
  } finally {
    await workspace.cleanup();
  }
});

if (
  process.env.REFORGE_ENABLE_LOCAL_INGESTION ===
  "true"
) {
  app.post("/v1/analyze/local", async (request, reply) => {
    const body = z
      .object({
        path: z.string().min(1),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply
        .code(400)
        .send({
          error: "Invalid request body",
        });
    }

    try {
      return await engine.analyze(
        body.data.path,
        {
          kind: "local",
          reference: body.data.path,
        },
      );
    } catch (error) {
      return reply
        .code(400)
        .send({
          error:
            error instanceof Error
              ? error.message
              : "Analysis failed",
        });
    }
  });
}

export { app };

import { fileURLToPath } from "node:url";

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (
  isMainModule &&
  process.env.REFORGE_SKIP_LISTEN !== "true" &&
  process.env.NODE_ENV !== "test"
) {
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({
    host: "127.0.0.1",
    port,
  });
}