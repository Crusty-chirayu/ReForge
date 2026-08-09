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
export type DoctorSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type DoctorCategory = "CODE_QUALITY" | "SECURITY" | "ARCHITECTURE" | "TESTING" | "DEPENDENCY" | "PERFORMANCE" | "MAINTAINABILITY" | "RISK";
export interface DoctorFinding { ruleId: string; category: DoctorCategory; severity: DoctorSeverity; confidence: "HIGH" | "MEDIUM" | "LOW"; title: string; description: string; impact: string; remediation: string; evidence: Evidence[]; affectedFiles?: string[]; affectedModules?: string[]; }
export interface DoctorReport { healthScore: number; summary: { findingCount: number; bySeverity: Record<DoctorSeverity, number>; byCategory: Partial<Record<DoctorCategory, number>>; scoring: "100 - min(100, sum(severityWeight * confidenceWeight))" }; findings: DoctorFinding[]; }
export interface BrainInference { statement: string; confidence: "HIGH" | "MEDIUM" | "LOW"; verified: false; }
export interface BrainResponse { answer: string; confidence: "HIGH" | "MEDIUM" | "LOW"; inferences: BrainInference[]; evidence: Evidence[]; limitations: string[]; contextUsed: string[]; contextTruncated: boolean; }
export interface PlanningRequest { goal: string; constraints?: string[]; priorities?: string[]; desiredTechnology?: string; }
export interface PlanTask { id: string; title: string; objective: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; dependencies: string[]; affectedModules: string[]; evidence: Evidence[]; acceptanceCriteria: string[]; verification: string[]; }
export interface PlanRisk { title: string; probability: "LOW" | "MEDIUM" | "HIGH"; impact: "LOW" | "MEDIUM" | "HIGH"; mitigation: string; evidence: Evidence[]; }
export interface Plan { objective: string; assumptions: string[]; tasks: PlanTask[]; orderedTaskIds: string[]; risks: PlanRisk[]; unresolvedQuestions: string[]; validation: { valid: boolean; errors: string[]; priorityFormula: "severityWeight + confidenceWeight - effortWeight" }; }
export type NoveltyCategory = "PRODUCT" | "FEATURE" | "UX" | "ARCHITECTURE" | "AI" | "AUTOMATION" | "SECURITY" | "PERFORMANCE" | "DEVELOPER_EXPERIENCE" | "BUSINESS_LOGIC";
export type NoveltyStrategy = "COMBINATION" | "GAP" | "TRANSFORMATION" | "ARCHITECTURAL" | "AI_AUGMENTATION" | "AUTOMATION";
export interface NoveltyRequest { goal?: string; report: AnalysisReport; }
export interface NoveltyCandidate { id: string; title: string; description: string; category: NoveltyCategory; strategy: NoveltyStrategy; noveltyScore: number; valueScore: number; feasibilityScore: number; fitScore: number; riskScore: number; confidence: "HIGH" | "MEDIUM" | "LOW"; source: "DETERMINISTIC" | "AI_RECOMMENDATION"; evidence: Evidence[]; affectedModules: string[]; prerequisites: string[]; tradeoffs: string[]; implementationDirection: string; assumptions: string[]; }
export interface NoveltyCapability { name: string; evidence: Evidence[]; existing: true; }
export interface NoveltyAnalysis { heuristic: "differentiation + fit + value + feasibility - risk"; capabilities: NoveltyCapability[]; candidates: NoveltyCandidate[]; limitations: string[]; }
export type ChangeCategory = "DEPENDENCY" | "DATABASE" | "AUTHENTICATION" | "API" | "ARCHITECTURE" | "MODULE" | "FEATURE" | "INFRASTRUCTURE" | "PERFORMANCE" | "SECURITY" | "TECHNOLOGY_MIGRATION" | "UNKNOWN";
export interface ChangeRequest { request: string; category?: ChangeCategory; target?: string; desiredTechnology?: string; }
export interface ChangeImpactReport { request: ChangeRequest; impactLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; confidence: "HIGH" | "MEDIUM" | "LOW"; directModules: string[]; indirectModules: string[]; relationships: { from: string; to: string; type: "IMPORTS" | "DEPENDS_ON" }[]; risks: { title: string; evidence: Evidence[]; kind: "EVIDENCE_BACKED" | "GENERAL_CONSIDERATION" }[]; blastRadius: { directModules: number; indirectModules: number; apiRoutes: number; dependencies: number; relatedTests: number; doctorFindings: number }; recommendations: string[]; verification: string[]; evidence: Evidence[]; assumptions: string[]; }
export type FileOperation = "CREATE" | "MODIFY" | "DELETE" | "RENAME";
export interface SnapshotFile { path: string; hash: string; size: number; category: FileCategory; }
export interface ProjectSnapshot {
  snapshotId: string;
  provenance: AnalysisReport["provenance"];
  files: SnapshotFile[];
  projectModelFingerprint?: string;
  dependencies: { name: string; version: string; type: "production" | "development" | "peer" }[];
  createdAt: string;
}
export interface PatchOperation {
  path: string;
  operation: FileOperation;
  expectedExistingHash?: string;
  content?: string;
  fromPath?: string;
  originatingTaskId?: string;
  evidence: Evidence[];
  provenance: AnalysisReport["provenance"];
}
export interface PatchValidationError { code: "APPROVAL_REQUIRED" | "SNAPSHOT_REQUIRED" | "SNAPSHOT_MISMATCH" | "UNSAFE_PATH" | "MISSING_CONTENT" | "MISSING_EXPECTED_HASH" | "STALE_PLAN" | "UNKNOWN_BUILD_TASK" | "INVALID_PROVENANCE" | "INVALID_OPERATION" | "DELETE_APPROVAL_REQUIRED" | "NOT_EXECUTABLE" | "RENAME_COLLISION" | "SOURCE_NOT_FOUND" | "CLEANUP_FAILED"; path?: string; message: string; }
export interface BuildRequest { goal: string; report: AnalysisReport; snapshot?: ProjectSnapshot; impact?: ChangeImpactReport; noveltyCandidate?: NoveltyCandidate; plan?: Plan; constraints?: string[]; }
export interface BuildPlan { objective: string; provenance: AnalysisReport["provenance"]; sourceSnapshotId?: string; buildTaskIds?: string[]; fileChanges: { path: string; operation: FileOperation; status: "EXISTING_FILE" | "PROPOSED_NEW_FILE"; expectedHash?: string; reason: string; evidence: Evidence[] }[]; dependencyChanges: { operation: "ADD" | "REMOVE" | "REPLACE"; name: string; reason: string; evidence: Evidence[] }[]; testChanges: string[]; risks: string[]; validation: { valid: boolean; errors: string[] }; assumptions: string[]; }
export type ExecutionStatus = "PENDING" | "APPROVED" | "RUNNING" | "VERIFYING" | "SUCCEEDED" | "FAILED" | "ROLLED_BACK" | "CANCELLED";
export interface ExecutionRequest { snapshotId?: string; snapshot?: ProjectSnapshot; build: BuildPlan; patches?: PatchOperation[]; approved: boolean; allowDelete?: boolean; }
export interface OperationReceipt {
  path: string;
  operation: FileOperation;
  applied: boolean;
  result?: "SUCCESS" | "FAILED" | "SKIPPED";
  error?: string;
  fromPath?: string;
  expectedExistingHash?: string;
  originatingTaskId?: string;
}
export interface DiffSummary {
  created: string[];
  modified: string[];
  renamed: { from: string; to: string }[];
  deleted: string[];
  unchanged: string[];
  failed: string[];
}
export interface ExecutionReceipt {
  executionId: string;
  snapshotId: string;
  status: ExecutionStatus;
  approved: boolean;
  operations: PatchOperation[];
  appliedOperations: OperationReceipt[];
  failedOperation?: OperationReceipt;
  workspaceCleanupStatus: "SUCCESS" | "FAILED";
  provenance: AnalysisReport["provenance"];
  buildTaskIds?: string[];
  diffSummary: DiffSummary;
  rollback: { attempted: boolean; succeeded: boolean };
  createdAt: string;
  completedAt: string;
}
export interface ExecutionResult { status: ExecutionStatus; changes: { path: string; operation: FileOperation; applied: boolean; reason: string; evidence: Evidence[] }[]; validation: { valid: boolean; errors: string[]; details?: PatchValidationError[] }; provenance: AnalysisReport["provenance"]; rollback: { attempted: boolean; succeeded: boolean }; receipt?: ExecutionReceipt; limitations: string[]; }

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
  doctor?: DoctorReport;
}

export interface Analyzer {
  readonly name: string;
  analyze(scan: ScanResult): Partial<AnalysisReport>;
}
