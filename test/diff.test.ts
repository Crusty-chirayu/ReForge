import assert from "node:assert/strict";
import test from "node:test";
import { createUnifiedDiff } from "../src/diff.js";

test("createUnifiedDiff: identical content returns empty string", () => {
  const diff = createUnifiedDiff("src/index.ts", "const x = 1;\n", "const x = 1;\n");
  assert.equal(diff, "");
});

test("createUnifiedDiff: creates unified diff header and hunks for modified content", () => {
  const oldContent = "line 1\nline 2\nline 3\n";
  const newContent = "line 1\nline 2 modified\nline 3\n";
  const diff = createUnifiedDiff("src/test.txt", oldContent, newContent);

  assert.ok(diff.includes("--- a/src/test.txt"));
  assert.ok(diff.includes("+++ b/src/test.txt"));
  assert.ok(diff.includes("@@ -1,4 +1,4 @@"));
  assert.ok(diff.includes("-line 2"));
  assert.ok(diff.includes("+line 2 modified"));
});

test("createUnifiedDiff: handles file creation (empty oldContent)", () => {
  const diff = createUnifiedDiff("src/new.ts", "", "export const a = 10;\n");
  assert.ok(diff.includes("--- a/src/new.ts"));
  assert.ok(diff.includes("+++ b/src/new.ts"));
  assert.ok(diff.includes("+export const a = 10;"));
});

test("createUnifiedDiff: handles file deletion (empty newContent)", () => {
  const diff = createUnifiedDiff("src/old.ts", "export const a = 10;\n", "");
  assert.ok(diff.includes("--- a/src/old.ts"));
  assert.ok(diff.includes("+++ b/src/old.ts"));
  assert.ok(diff.includes("-export const a = 10;"));
});
