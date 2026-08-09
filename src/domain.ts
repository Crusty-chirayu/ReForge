export type SourceKind = "local" | "repository" | "archive";

export interface ProjectSource {
  kind: SourceKind;
  reference?: string;
}

export interface ScannedFile {
  relativePath: string;
  extension: string;
  size: number;
  text?: string;
}

export type FileCategory = "SOURCE" | "TEST" | "CONFIG" | "DOCUMENTATION" | "ASSET" | "GENERATED" | "DEPENDENCY" | "UNKNOWN";
export interface ProjectFile { path: string; extension: string; language?: string; size: number; lineCount: number; category: FileCategory; }
export interface ProjectSymbol { name: string; type: "function" | "class" | "interface" | "type" | "variable"; file: string; line: number; exported: boolean; imported: boolean; }
export interface ModuleImport { specifier: string; kind: "internal" | "external"; target?: string; symbols: string[]; evidence: Evidence; }
export interface ProjectModule { id: string; imports: ModuleImport[]; exports: string[]; symbols: string[]; relationships: string[]; }
export interface ApiEndpoint { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string | "unknown"; file: string; handler?: string; evidence: Evidence; }
export interface ProjectModel {
  name: string; root: { path: string }; files: ProjectFile[]; modules: ProjectModule[]; symbols: ProjectSymbol[];
  packageManagers: string[]; dependencies: { name: string; version: string; type: "production" | "development" | "peer"; evidence: Evidence }[];
  sourceDirectories: string[]; testDirectories: string[]; configurationFiles: string[]; environmentFiles: { path: string; present: true }[];
  entryPoints: string[]; apiEndpoints: ApiEndpoint[]; databaseTechnologies: Finding[]; authenticationTechnologies: Finding[];
  metrics: { totalFiles: number; sourceFiles: number; testFiles: number; totalLines: number; sourceLines: number; largestFiles: { path: string; size: number }[]; largestModules: { id: string; symbolCount: number }[]; dependencyCount: number; internalModuleCount: number; testSourceRatio?: number; };
}

export interface ScanResult {
  root: string;
  files: ScannedFile[];
  ignoredDirectories: string[];
  skippedFiles: number;
}

export interface Evidence {
  file: string;
  detail: string;
}

export interface Finding {
  name: string;
  confidence: "high" | "medium" | "low";
  evidence: Evidence[];
}

export interface AnalysisReport {
  schemaVersion: "1.0";
  generatedAt: string;
  provenance: { source: ProjectSource; licenses: Evidence[]; copyrightNotices: Evidence[] };
  overview: { fileCount: number; analyzableFileCount: number; totalBytes: number };
  languages: Finding[];
  frameworks: Finding[];
  dependencies: Finding[];
  structure: { topLevel: string[]; importantFiles: string[]; ignoredDirectories: string[] };
  entryPoints: Finding[];
  apiHints: Finding[];
  databaseHints: Finding[];
  authenticationHints: Finding[];
  architecture: Finding[];
  codeQualityObservations: Finding[];
  risks: Finding[];
  recommendedNextSteps: string[];
  projectModel?: ProjectModel;
}

export interface Analyzer {
  readonly name: string;
  analyze(scan: ScanResult): Partial<AnalysisReport>;
}
