// ─────────────────────────────────────────────────────────────────────────────
// ReForge API types.
//
// These types mirror the frozen backend contracts in `src/domain.ts` and the
// response envelopes in `src/server.ts`. They are hand-maintained mirrors of
// the JSON wire contract — the frontend never imports backend source files.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared primitives ─────────────────────────────────────────────────────────

export interface Evidence {
  file: string;
  detail: string;
}

export interface Finding {
  name: string;
  confidence: "high" | "medium" | "low";
  evidence: Evidence[];
}

// ── Source & provenance ───────────────────────────────────────────────────────

export type SourceKind = "local" | "repository" | "archive";

export interface ProjectSource {
  kind: SourceKind;
  reference?: string;
}

export interface Provenance {
  source: ProjectSource;
  licenses: Evidence[];
  copyrightNotices: Evidence[];
}

// ── Analysis report ───────────────────────────────────────────────────────────

export interface AnalysisReport {
  schemaVersion: "1.0";
  generatedAt: string;
  provenance: Provenance;
  overview: {
    fileCount: number;
    analyzableFileCount: number;
    totalBytes: number;
  };
  languages: Finding[];
  frameworks: Finding[];
  dependencies: Finding[];
  structure: {
    topLevel: string[];
    importantFiles: string[];
    ignoredDirectories: string[];
  };
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

export type FileCategory =
  | "SOURCE"
  | "TEST"
  | "CONFIG"
  | "DOCUMENTATION"
  | "ASSET"
  | "GENERATED"
  | "DEPENDENCY"
  | "UNKNOWN";

export interface ProjectFile {
  path: string;
  extension: string;
  language?: string;
  size: number;
  lineCount: number;
  category: FileCategory;
}

export interface ProjectSymbol {
  name: string;
  type: "function" | "class" | "interface" | "type" | "variable";
  file: string;
  line: number;
  exported: boolean;
  imported: boolean;
}

export interface ModuleImport {
  specifier: string;
  kind: "internal" | "external";
  target?: string;
  symbols: string[];
  evidence: Evidence;
}

export interface ProjectModule {
  id: string;
  imports: ModuleImport[];
  exports: string[];
  symbols: string[];
  relationships: string[];
}

export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string | "unknown";
  file: string;
  handler?: string;
  evidence: Evidence;
}

export interface ProjectModel {
  name: string;
  root: { path: string };
  files: ProjectFile[];
  modules: ProjectModule[];
  symbols: ProjectSymbol[];
  packageManagers: string[];
  dependencies: {
    name: string;
    version: string;
    type: "production" | "development" | "peer";
    evidence: Evidence;
  }[];
  sourceDirectories: string[];
  testDirectories: string[];
  configurationFiles: string[];
  environmentFiles: { path: string; present: true }[];
  entryPoints: string[];
  apiEndpoints: ApiEndpoint[];
  databaseTechnologies: Finding[];
  authenticationTechnologies: Finding[];
  metrics: ProjectMetrics;
}

export interface ProjectMetrics {
  totalFiles: number;
  sourceFiles: number;
  testFiles: number;
  totalLines: number;
  sourceLines: number;
  largestFiles: { path: string; size: number }[];
  largestModules: { id: string; symbolCount: number }[];
  dependencyCount: number;
  internalModuleCount: number;
  testSourceRatio?: number;
}

// ── Doctor ────────────────────────────────────────────────────────────────────

export type DoctorSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type DoctorCategory =
  | "CODE_QUALITY"
  | "SECURITY"
  | "ARCHITECTURE"
  | "TESTING"
  | "DEPENDENCY"
  | "PERFORMANCE"
  | "MAINTAINABILITY"
  | "RISK";

export interface DoctorFinding {
  ruleId: string;
  category: DoctorCategory;
  severity: DoctorSeverity;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  impact: string;
  remediation: string;
  evidence: Evidence[];
  affectedFiles?: string[];
  affectedModules?: string[];
}

export interface DoctorReport {
  healthScore: number;
  summary: {
    findingCount: number;
    bySeverity: Record<DoctorSeverity, number>;
    byCategory: Partial<Record<DoctorCategory, number>>;
    scoring: "100 - min(100, sum(severityWeight * confidenceWeight))";
  };
  findings: DoctorFinding[];
}

// ── Brain ─────────────────────────────────────────────────────────────────────

export interface BrainInference {
  statement: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  verified: false;
}

export interface BrainResponse {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  inferences: BrainInference[];
  evidence: Evidence[];
  limitations: string[];
  contextUsed: string[];
  contextTruncated: boolean;
}

// ── Planning ──────────────────────────────────────────────────────────────────

export interface PlanningRequest {
  goal: string;
  constraints?: string[];
  priorities?: string[];
  desiredTechnology?: string;
}

export interface PlanTask {
  id: string;
  title: string;
  objective: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  dependencies: string[];
  affectedModules: string[];
  evidence: Evidence[];
  acceptanceCriteria: string[];
  verification: string[];
}

export interface PlanRisk {
  title: string;
  probability: "LOW" | "MEDIUM" | "HIGH";
  impact: "LOW" | "MEDIUM" | "HIGH";
  mitigation: string;
  evidence: Evidence[];
}

export interface Plan {
  objective: string;
  assumptions: string[];
  tasks: PlanTask[];
  orderedTaskIds: string[];
  risks: PlanRisk[];
  unresolvedQuestions: string[];
  validation: {
    valid: boolean;
    errors: string[];
    priorityFormula: "severityWeight + confidenceWeight - effortWeight";
  };
}

// ── Novelty ───────────────────────────────────────────────────────────────────

export type NoveltyCategory =
  | "PRODUCT"
  | "FEATURE"
  | "UX"
  | "ARCHITECTURE"
  | "AI"
  | "AUTOMATION"
  | "SECURITY"
  | "PERFORMANCE"
  | "DEVELOPER_EXPERIENCE"
  | "BUSINESS_LOGIC";

export type NoveltyStrategy =
  | "COMBINATION"
  | "GAP"
  | "TRANSFORMATION"
  | "ARCHITECTURAL"
  | "AI_AUGMENTATION"
  | "AUTOMATION";

export interface NoveltyCandidate {
  id: string;
  title: string;
  description: string;
  category: NoveltyCategory;
  strategy: NoveltyStrategy;
  noveltyScore: number;
  valueScore: number;
  feasibilityScore: number;
  fitScore: number;
  riskScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source: "DETERMINISTIC" | "AI_RECOMMENDATION";
  evidence: Evidence[];
  affectedModules: string[];
  prerequisites: string[];
  tradeoffs: string[];
  implementationDirection: string;
  assumptions: string[];
}

export interface NoveltyCapability {
  name: string;
  evidence: Evidence[];
  existing: true;
}

export interface NoveltyAnalysis {
  heuristic: "differentiation + fit + value + feasibility - risk";
  capabilities: NoveltyCapability[];
  candidates: NoveltyCandidate[];
  limitations: string[];
}

// ── Impact ────────────────────────────────────────────────────────────────────

export type ChangeCategory =
  | "DEPENDENCY"
  | "DATABASE"
  | "AUTHENTICATION"
  | "API"
  | "ARCHITECTURE"
  | "MODULE"
  | "FEATURE"
  | "INFRASTRUCTURE"
  | "PERFORMANCE"
  | "SECURITY"
  | "TECHNOLOGY_MIGRATION"
  | "UNKNOWN";

export interface ChangeRequest {
  request: string;
  category?: ChangeCategory;
  target?: string;
  desiredTechnology?: string;
}

export interface ChangeImpactReport {
  request: ChangeRequest;
  impactLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  directModules: string[];
  indirectModules: string[];
  relationships: { from: string; to: string; type: "IMPORTS" | "DEPENDS_ON" }[];
  risks: {
    title: string;
    evidence: Evidence[];
    kind: "EVIDENCE_BACKED" | "GENERAL_CONSIDERATION";
  }[];
  blastRadius: {
    directModules: number;
    indirectModules: number;
    apiRoutes: number;
    dependencies: number;
    relatedTests: number;
    doctorFindings: number;
  };
  recommendations: string[];
  verification: string[];
  evidence: Evidence[];
  assumptions: string[];
}

// ── Build ─────────────────────────────────────────────────────────────────────

export type FileOperation = "CREATE" | "MODIFY" | "DELETE" | "RENAME";

export interface SnapshotFile {
  path: string;
  hash: string;
  size: number;
  category: FileCategory;
}

export interface ProjectSnapshot {
  snapshotId: string;
  provenance: Provenance;
  files: SnapshotFile[];
  projectModelFingerprint?: string;
  dependencies: {
    name: string;
    version: string;
    type: "production" | "development" | "peer";
  }[];
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
  provenance: Provenance;
}

export type PatchValidationErrorCode =
  | "APPROVAL_REQUIRED"
  | "SNAPSHOT_REQUIRED"
  | "SNAPSHOT_MISMATCH"
  | "UNSAFE_PATH"
  | "MISSING_CONTENT"
  | "MISSING_EXPECTED_HASH"
  | "STALE_PLAN"
  | "UNKNOWN_BUILD_TASK"
  | "INVALID_PROVENANCE"
  | "INVALID_OPERATION"
  | "DELETE_APPROVAL_REQUIRED"
  | "NOT_EXECUTABLE"
  | "RENAME_COLLISION"
  | "SOURCE_NOT_FOUND"
  | "CLEANUP_FAILED";

export interface PatchValidationError {
  code: PatchValidationErrorCode;
  path?: string;
  message: string;
}

export interface BuildRequest {
  goal: string;
  report: AnalysisReport;
  snapshot?: ProjectSnapshot;
  impact?: ChangeImpactReport;
  noveltyCandidate?: NoveltyCandidate;
  plan?: Plan;
  constraints?: string[];
}

export interface BuildPlan {
  objective: string;
  provenance: Provenance;
  sourceSnapshotId?: string;
  buildTaskIds?: string[];
  fileChanges: {
    path: string;
    operation: FileOperation;
    status: "EXISTING_FILE" | "PROPOSED_NEW_FILE";
    expectedHash?: string;
    reason: string;
    evidence: Evidence[];
  }[];
  dependencyChanges: {
    operation: "ADD" | "REMOVE" | "REPLACE";
    name: string;
    reason: string;
    evidence: Evidence[];
  }[];
  testChanges: string[];
  risks: string[];
  validation: { valid: boolean; errors: string[] };
  assumptions: string[];
}

// ── Verification ──────────────────────────────────────────────────────────────

export type VerificationStatus =
  | "PASSED"
  | "FAILED"
  | "TIMEOUT"
  | "NOT_AVAILABLE"
  | "NOT_EXECUTABLE"
  | "BLOCKED"
  | "ERROR";

export interface VerificationCommand {
  id: string;
  label: string;
  executable: string;
  args: string[];
  reason: string;
  timeoutMs?: number;
}

export interface VerificationPolicy {
  available: boolean;
  commands: VerificationCommand[];
  reason?: string;
}

export interface VerificationResultItem {
  id: string;
  label: string;
  status: VerificationStatus;
  exitCode?: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  outputTruncated: boolean;
  error?: string;
}

export interface VerificationResult {
  attempted: boolean;
  overallStatus: VerificationStatus;
  results: VerificationResultItem[];
  policy?: VerificationPolicy;
}

// ── Execution ─────────────────────────────────────────────────────────────────

export type ExecutionStatus =
  | "PENDING"
  | "APPROVED"
  | "RUNNING"
  | "VERIFYING"
  | "SUCCEEDED"
  | "FAILED"
  | "ROLLED_BACK"
  | "CANCELLED";

export interface ExecutionRequest {
  snapshotId?: string;
  snapshot?: ProjectSnapshot;
  build: BuildPlan;
  patches?: PatchOperation[];
  approved: boolean;
  allowDelete?: boolean;
  verify?: boolean;
}

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
  provenance: Provenance;
  buildTaskIds?: string[];
  diffSummary: DiffSummary;
  verification?: VerificationResult;
  rollback: { attempted: boolean; succeeded: boolean };
  createdAt: string;
  completedAt: string;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  changes: {
    path: string;
    operation: FileOperation;
    applied: boolean;
    reason: string;
    evidence: Evidence[];
  }[];
  validation: { valid: boolean; errors: string[]; details?: PatchValidationError[] };
  provenance: Provenance;
  rollback: { attempted: boolean; succeeded: boolean };
  receipt?: ExecutionReceipt;
  limitations: string[];
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export interface PipelineRequest {
  goal: string;
  approved: boolean;
  allowDelete?: boolean;
  verify?: boolean;
}

export interface PipelineResult {
  pipelineId: string;
  status: "PASSED" | "FAILED" | "BLOCKED" | "ERROR";
  goal: string;
  report: AnalysisReport;
  plan: Plan;
  impact: ChangeImpactReport;
  build: BuildPlan;
  execution?: ExecutionReceipt;
  snapshot: ProjectSnapshot;
  workspaceCleanupStatus: "SUCCESS" | "FAILED";
  createdAt: string;
  completedAt: string;
}

export interface PipelineExecutionSummary {
  pipelineId: string;
  goal: string;
  status: "PASSED" | "FAILED" | "BLOCKED" | "ERROR";
  snapshotId: string;
  approved: boolean;
  appliedPatchCount: number;
  verificationStatus?: VerificationStatus;
  createdAt: string;
  completedAt: string;
}

export interface PipelineAuditLogEntry {
  auditId: string;
  pipelineId: string;
  timestamp: string;
  eventType:
    | "INGESTED"
    | "SNAPSHOT_CREATED"
    | "PLAN_GENERATED"
    | "IMPACT_EVALUATED"
    | "BUILD_PROPOSED"
    | "PATCHES_APPLIED"
    | "VERIFICATION_COMPLETED"
    | "ROLLED_BACK"
    | "CLEANED_UP";
  details?: Record<string, unknown>;
}

// ── Snapshot comparison & historical intelligence ─────────────────────────────

export type FileDiffOperation = "CREATE" | "MODIFY" | "DELETE" | "RENAME" | "UNCHANGED";

export interface SnapshotFileDiff {
  path: string;
  operation: FileDiffOperation;
  beforeHash?: string;
  afterHash?: string;
  beforeSize?: number;
  afterSize?: number;
  fromPath?: string;
  toPath?: string;
  category?: FileCategory;
}

export interface SnapshotDependencyDiff {
  operation: "ADD" | "REMOVE" | "VERSION_CHANGE";
  name: string;
  beforeVersion?: string;
  afterVersion?: string;
  type?: "production" | "development" | "peer";
}

export interface SnapshotDiff {
  beforeSnapshotId: string;
  afterSnapshotId: string;
  created: SnapshotFileDiff[];
  modified: SnapshotFileDiff[];
  deleted: SnapshotFileDiff[];
  unchanged: SnapshotFileDiff[];
  renamed: SnapshotFileDiff[];
  dependencyChanges: SnapshotDependencyDiff[];
  moduleChanges: { added: string[]; removed: string[] };
  projectModelChanged: boolean;
  categoryDistribution: Partial<
    Record<FileCategory, { before: number; after: number }>
  >;
  summary: {
    totalCreated: number;
    totalModified: number;
    totalDeleted: number;
    totalUnchanged: number;
    totalRenamed: number;
    totalAddedBytes: number;
    totalDeletedBytes: number;
  };
}

export interface FileChangeFrequency {
  path: string;
  changeCount: number;
  transitionCount: number;
  changeRate: number;
}

export interface HistoricalChurnSummary {
  totalAddedFiles: number;
  totalDeletedFiles: number;
  totalModifiedFiles: number;
  totalRenamedFiles: number;
  totalAddedBytes: number;
  totalDeletedBytes: number;
}

export interface ArchitectureDrift {
  detected: boolean;
  indicators: string[];
  moduleChanges: { added: string[]; removed: string[] };
  dependencyChanges: SnapshotDependencyDiff[];
  projectModelChanged: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: Evidence[];
  limitations: string[];
}

export interface HistoricalProjectIntelligence {
  projectSnapshotId: string;
  previousSnapshotId?: string;
  snapshotCount: number;
  totalFiles: number;
  sourceFileCount: number;
  testFileCount: number;
  dependencyCount: number;
  filesAddedSincePrevious: number;
  filesModifiedSincePrevious: number;
  filesDeletedSincePrevious: number;
  filesRenamedSincePrevious: number;
  dependencyChanges: SnapshotDependencyDiff[];
  moduleChanges: { added: string[]; removed: string[] };
  projectModelChanged: boolean;
  changeFrequency: FileChangeFrequency[];
  churnSummary: HistoricalChurnSummary;
  architectureDrift: ArchitectureDrift;
  evidence: Evidence[];
}

export interface ProjectHistoryItem {
  snapshotId: string;
  pipelineId?: string;
  createdAt: string;
  fileCount: number;
  dependencyFingerprint?: string;
  projectModelFingerprint?: string;
  verificationStatus?: VerificationStatus;
}

// ── API response envelopes (from src/server.ts) ──────────────────────────────

export interface HealthResponse {
  status: "ok";
  service: string;
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
}

export interface PlanResponse {
  plan: Plan;
}

export interface NoveltyResponse {
  novelty: NoveltyAnalysis;
}

/** POST /v1/impact returns the ChangeImpactReport directly. */
export type ImpactResponse = ChangeImpactReport;

export interface BuildResponse {
  build: BuildPlan;
}

/** POST /v1/execute returns receipt + server-controlled snapshot summary. */
export interface ExecuteResponse {
  execution: ExecutionReceipt;
  receipt: ExecutionReceipt;
  snapshot: {
    snapshotId: string;
    provenance: Provenance;
    fileCount: number;
    projectModelFingerprint?: string;
  };
}

/** POST /v1/pipeline returns the PipelineResult under both keys. */
export interface PipelineResponse {
  pipeline: PipelineResult;
  result: PipelineResult;
}

export interface PipelineHistoryResponse {
  history: PipelineExecutionSummary[];
  limit: number;
  count: number;
}

/** GET /v1/pipeline/:pipelineId returns { execution, result } (both the stored PipelineResult). */
export interface PipelineItemResponse {
  execution: PipelineResult;
  result: PipelineResult;
}

export interface SnapshotResponse {
  snapshot: ProjectSnapshot;
}

export interface SnapshotCompareResponse {
  diff: SnapshotDiff;
}

export interface IntelligenceResponse {
  intelligence: HistoricalProjectIntelligence;
}

export interface ProjectHistoryResponse {
  history: ProjectHistoryItem[];
  limit: number;
  count: number;
}
