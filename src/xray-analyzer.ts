import path from "node:path";
import ts from "typescript";
import type { Analyzer, ApiEndpoint, Evidence, FileCategory, Finding, ModuleImport, ProjectFile, ProjectModel, ProjectModule, ProjectSymbol, ScanResult } from "./domain.js";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const LANGUAGE: Record<string, string> = { ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript", ".json": "JSON" };
const DATABASE = new Map([["prisma", "Prisma"], ["@prisma/client", "Prisma"], ["mongoose", "Mongoose / MongoDB"], ["mongodb", "MongoDB"], ["drizzle-orm", "Drizzle"], ["typeorm", "TypeORM"], ["pg", "PostgreSQL"], ["postgres", "PostgreSQL"], ["mysql", "MySQL"], ["mysql2", "MySQL"], ["sqlite3", "SQLite"], ["better-sqlite3", "SQLite"], ["redis", "Redis"]]);
const AUTH = new Map([["jsonwebtoken", "JWT"], ["jose", "JWT"], ["next-auth", "NextAuth/Auth.js"], ["@auth/core", "Auth.js"], ["passport", "Passport"], ["bcrypt", "bcrypt"], ["bcryptjs", "bcrypt"], ["oauth", "OAuth"]]);
export interface FileClassificationRules { testPath: RegExp; generatedPath: RegExp; dependencyPath: RegExp; }
export const DEFAULT_FILE_CLASSIFICATION_RULES: FileClassificationRules = { testPath: /(^|\/)(__tests__|test|tests|spec|specs)\//, generatedPath: /(^|\/)(dist|build|coverage|\.next|\.cache|generated)\//, dependencyPath: /(^|\/)(node_modules|vendor)\// };

export function classifyFile(filePath: string, rules: FileClassificationRules = DEFAULT_FILE_CLASSIFICATION_RULES): FileCategory {
  const lower = filePath.toLowerCase(); const base = path.posix.basename(lower);
  if (rules.dependencyPath.test(lower)) return "DEPENDENCY";
  if (rules.generatedPath.test(lower) || /\.min\.(js|css)$/.test(lower)) return "GENERATED";
  if (rules.testPath.test(lower) || /\.(test|spec)\.[^.]+$/.test(base)) return "TEST";
  if (/(^|\/)\.env(?:\.|$)/.test(lower)) return "CONFIG";
  if (["package.json", "tsconfig.json", "jsconfig.json", "dockerfile", "compose.yml", "compose.yaml"].includes(base) || /(^|\/)\.[^/]+(rc|config)(\.|$)/.test(lower) || /\.(ya?ml|toml|ini|config)$/.test(lower)) return "CONFIG";
  if (/^(readme|changelog|contributing|license|notice)/.test(base) || /\.(md|mdx|rst|txt)$/.test(lower)) return "DOCUMENTATION";
  if (/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|pdf)$/.test(lower)) return "ASSET";
  if (SOURCE_EXTENSIONS.has(path.posix.extname(lower))) return "SOURCE";
  return "UNKNOWN";
}
const evidence = (file: string, line: number, detail: string): Evidence => ({ file, detail: line ? `line ${line}: ${detail}` : detail });
const isRelative = (value: string) => value.startsWith(".") || value.startsWith("/");
function resolveInternal(from: string, specifier: string, paths: Set<string>): string | undefined {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  const options = [base, ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"].map((extension) => `${base}${extension}`), ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((entry) => `${base}/${entry}`)];
  return options.find((candidate) => paths.has(candidate));
}
function exported(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current && !ts.isSourceFile(current)) {
    if (ts.canHaveModifiers(current) && ts.getModifiers(current)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return true;
    current = current.parent;
  }
  return false;
}
function importedNames(node: ts.ImportDeclaration): string[] {
  const clause = node.importClause; if (!clause) return [];
  const names = clause.name ? [clause.name.text] : [];
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) names.push(...clause.namedBindings.elements.map((element) => element.name.text));
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) names.push(clause.namedBindings.name.text);
  return names;
}
function sourceKind(extension: string): ts.ScriptKind { return extension === ".json" ? ts.ScriptKind.JSON : extension === ".tsx" || extension === ".jsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS; }

export const projectXRayAnalyzer: Analyzer = { name: "project-xray", analyze(scan): Partial<{ projectModel: ProjectModel }> {
  const filePaths = new Set(scan.files.map((file) => file.relativePath));
  const files: ProjectFile[] = scan.files.map((file) => ({ path: file.relativePath, extension: file.extension, language: LANGUAGE[file.extension], size: file.size, lineCount: file.text?.split(/\r?\n/).length ?? 0, category: classifyFile(file.relativePath) }));
  const modules: ProjectModule[] = []; const symbols: ProjectSymbol[] = []; const apiEndpoints: ApiEndpoint[] = []; const dependencyEvidence = new Map<string, Evidence[]>();
  const addDependencyEvidence = (name: string, item: Evidence) => dependencyEvidence.set(name, [...(dependencyEvidence.get(name) ?? []), item]);
  for (const file of scan.files.filter((item) => item.text !== undefined && SOURCE_EXTENSIONS.has(item.extension))) {
    const source = ts.createSourceFile(file.relativePath, file.text!, ts.ScriptTarget.Latest, true, sourceKind(file.extension));
    const imports: ModuleImport[] = []; const exports: string[] = []; const moduleSymbols: string[] = [];
    const lineOf = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const addImport = (specifier: string, names: string[], node: ts.Node) => { const line = lineOf(node); const kind = isRelative(specifier) ? "internal" : "external"; const target = kind === "internal" ? resolveInternal(file.relativePath, specifier, filePaths) : undefined; imports.push({ specifier, kind, target, symbols: names, evidence: evidence(file.relativePath, line, `imports ${specifier}`) }); if (kind === "external") addDependencyEvidence(specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/"), evidence(file.relativePath, line, `import ${specifier}`)); };
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) addImport(node.moduleSpecifier.text, importedNames(node), node);
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) addImport(node.moduleSpecifier.text, [], node);
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) addImport(node.arguments[0].text, [], node);
      let name: string | undefined; let type: ProjectSymbol["type"] | undefined;
      if (ts.isFunctionDeclaration(node) && node.name) { name = node.name.text; type = "function"; }
      else if (ts.isClassDeclaration(node) && node.name) { name = node.name.text; type = "class"; }
      else if (ts.isInterfaceDeclaration(node)) { name = node.name.text; type = "interface"; }
      else if (ts.isTypeAliasDeclaration(node)) { name = node.name.text; type = "type"; }
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) { name = node.name.text; type = "variable"; }
      if (name && type) { const line = lineOf(node); const isExported = exported(node.parent) || exported(node); symbols.push({ name, type, file: file.relativePath, line, exported: isExported, imported: false }); moduleSymbols.push(name); if (isExported) exports.push(name); }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.text.toUpperCase(); const receiver = node.expression.expression.getText(source);
        if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method) && /^(app|router|fastify|server)$/i.test(receiver)) { const first = node.arguments[0]; const handler = node.arguments[1]; apiEndpoints.push({ method: method as ApiEndpoint["method"], path: first && ts.isStringLiteralLike(first) ? first.text : "unknown", file: file.relativePath, handler: handler && ts.isIdentifier(handler) ? handler.text : undefined, evidence: evidence(file.relativePath, lineOf(node), `${receiver}.${method.toLowerCase()} route`) }); }
      }
      ts.forEachChild(node, visit);
    };
    visit(source); modules.push({ id: file.relativePath, imports, exports, symbols: moduleSymbols, relationships: imports.filter((item) => item.kind === "internal" && item.target).map((item) => item.target!) });
  }
  const packageFile = scan.files.find((file) => file.relativePath === "package.json" && file.text); let packageName = path.basename(scan.root); const dependencies: ProjectModel["dependencies"] = [];
  if (packageFile) try { const parsed = JSON.parse(packageFile.text!) as { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string> }; packageName = parsed.name || packageName; for (const [field, type] of [["dependencies", "production"], ["devDependencies", "development"], ["peerDependencies", "peer"]] as const) for (const [name, version] of Object.entries(parsed[field] ?? {})) dependencies.push({ name, version, type, evidence: evidence("package.json", 0, `${field}: ${name}`) }); } catch { /* existing risk analyzer handles malformed manifests */ }
  const technologyFindings = (catalog: Map<string, string>): Finding[] => { const output = new Map<string, Evidence[]>(); for (const dependency of dependencies) { const technology = catalog.get(dependency.name); if (technology) output.set(technology, [...(output.get(technology) ?? []), dependency.evidence]); } for (const [name, items] of dependencyEvidence) { const technology = catalog.get(name); if (technology) output.set(technology, [...(output.get(technology) ?? []), ...items]); } return [...output].map(([name, items]) => ({ name, confidence: "high", evidence: items })); };
  for (const symbol of symbols) symbol.imported = modules.some((module) => module.imports.some((item) => item.kind === "internal" && item.target === symbol.file && item.symbols.includes(symbol.name)));
  const sourceDirectories = [...new Set(files.filter((file) => file.category === "SOURCE").map((file) => file.path.split("/")[0]!).filter(Boolean))].sort(); const testDirectories = [...new Set(files.filter((file) => file.category === "TEST").map((file) => file.path.split("/")[0]!).filter(Boolean))].sort();
  const totalLines = files.reduce((sum, file) => sum + file.lineCount, 0); const sourceFiles = files.filter((file) => file.category === "SOURCE"); const testFiles = files.filter((file) => file.category === "TEST");
  const model: ProjectModel = { name: packageName, root: { path: scan.root }, files, modules, symbols, packageManagers: packageFile ? ["npm"] : [], dependencies, sourceDirectories, testDirectories, configurationFiles: files.filter((file) => file.category === "CONFIG").map((file) => file.path), environmentFiles: files.filter((file) => /(^|\/)\.env(?:\.|$)/.test(file.path)).map((file) => ({ path: file.path, present: true })), entryPoints: modules.filter((module) => /(^|\/)(main|index|server|app)\.[^.]+$/.test(module.id)).map((module) => module.id), apiEndpoints, databaseTechnologies: technologyFindings(DATABASE), authenticationTechnologies: technologyFindings(AUTH), metrics: { totalFiles: files.length, sourceFiles: sourceFiles.length, testFiles: testFiles.length, totalLines, sourceLines: sourceFiles.reduce((sum, file) => sum + file.lineCount, 0), largestFiles: [...files].sort((a, b) => b.size - a.size).slice(0, 10).map((file) => ({ path: file.path, size: file.size })), largestModules: [...modules].sort((a, b) => b.symbols.length - a.symbols.length).slice(0, 10).map((module) => ({ id: module.id, symbolCount: module.symbols.length })), dependencyCount: dependencies.length, internalModuleCount: modules.reduce((sum, module) => sum + module.imports.filter((item) => item.kind === "internal").length, 0), testSourceRatio: sourceFiles.length ? testFiles.length / sourceFiles.length : undefined } };
  return { projectModel: model };
}};
