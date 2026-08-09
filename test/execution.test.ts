import assert from "node:assert/strict";
import test from "node:test";
import { validateExecution } from "../src/execution.js";
const build = { provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] }, validation: { valid: true, errors: [] }, fileChanges: [{ path: "src/new.ts", operation: "CREATE", reason: "proposed", evidence: [] }] } as any;
test("requires approval and never applies changes", () => { const result = validateExecution({ build, approved: false }); assert.equal(result.status, "FAILED"); assert.equal(result.changes[0]?.applied, false); });
test("rejects unsafe and delete operations without explicit delete approval", () => { const result = validateExecution({ build: { ...build, fileChanges: [{ path: "../x", operation: "DELETE", reason: "x", evidence: [] }] }, approved: true }); assert.equal(result.validation.valid, false); });
