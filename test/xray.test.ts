import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AnalysisEngine } from "../src/engine.js";

test("builds an evidence-backed Project X-Ray model from TypeScript and JavaScript", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-xray-"));
  try {
    await mkdir(path.join(root, "src", "models"), { recursive: true });
    await mkdir(path.join(root, "src", "routes"), { recursive: true });
    await mkdir(path.join(root, "test"), { recursive: true });
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "xray-fixture", dependencies: { fastify: "^5", prisma: "^6", jsonwebtoken: "^9", zod: "^3" }, devDependencies: { typescript: "^5" }, peerDependencies: { react: "^19" } }));
    await writeFile(path.join(root, ".env.example"), "DATABASE_URL=not-a-secret-value");
    await writeFile(path.join(root, "src", "models", "order.ts"), "export interface Order { id: string }\nexport class OrderRepository {}\n");
    await writeFile(path.join(root, "src", "services.ts"), "import { OrderRepository } from './models/order';\nimport { z } from 'zod';\nexport const orderSchema = z.object({ id: z.string() });\nexport function loadOrder(): OrderRepository { return new OrderRepository(); }\n");
    await writeFile(path.join(root, "src", "routes", "products.ts"), "import { loadOrder } from '../services';\nimport jwt from 'jsonwebtoken';\nexport function listProducts() { return loadOrder(); }\napp.get('/api/products', listProducts);\n");
    await writeFile(path.join(root, "src", "legacy.js"), "import { loadOrder } from './services';\nexport const legacy = () => loadOrder();\n");
    await writeFile(path.join(root, "test", "products.test.ts"), "import { listProducts } from '../src/routes/products';\ntest('products', () => listProducts());\n");
    const report = await new AnalysisEngine().analyze(root, { kind: "local" });
    const model = report.projectModel!;
    assert.equal(model.name, "xray-fixture");
    assert.ok(model.files.some((file) => file.path === "src/services.ts" && file.category === "SOURCE" && file.language === "TypeScript"));
    assert.ok(model.files.some((file) => file.path === "test/products.test.ts" && file.category === "TEST"));
    assert.ok(model.files.some((file) => file.path === ".env.example" && file.category === "CONFIG"));
    assert.deepEqual(model.environmentFiles, [{ path: ".env.example", present: true }]);
    assert.ok(model.symbols.some((symbol) => symbol.name === "OrderRepository" && symbol.type === "class" && symbol.exported));
    assert.ok(model.symbols.some((symbol) => symbol.name === "OrderRepository" && symbol.imported));
    assert.ok(model.symbols.some((symbol) => symbol.name === "loadOrder" && symbol.type === "function" && symbol.exported));
    assert.ok(model.symbols.some((symbol) => symbol.name === "legacy" && symbol.type === "variable" && symbol.exported));
    const services = model.modules.find((module) => module.id === "src/services.ts")!;
    assert.ok(services.imports.some((item) => item.specifier === "./models/order" && item.kind === "internal" && item.target === "src/models/order.ts"));
    assert.ok(services.imports.some((item) => item.specifier === "zod" && item.kind === "external"));
    assert.ok(model.apiEndpoints.some((endpoint) => endpoint.method === "GET" && endpoint.path === "/api/products" && endpoint.handler === "listProducts" && endpoint.evidence.detail.includes("line")));
    assert.ok(model.dependencies.some((dependency) => dependency.name === "react" && dependency.type === "peer"));
    assert.ok(model.databaseTechnologies.some((technology) => technology.name === "Prisma"));
    assert.ok(model.authenticationTechnologies.some((technology) => technology.name === "JWT"));
    assert.equal(model.metrics.sourceFiles, 4);
    assert.equal(model.metrics.testFiles, 1);
    assert.equal(model.metrics.internalModuleCount, 4);
    assert.ok(model.metrics.totalLines > model.metrics.sourceLines);
    assert.ok(report.apiHints.some((hint) => hint.name === "GET /api/products"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
