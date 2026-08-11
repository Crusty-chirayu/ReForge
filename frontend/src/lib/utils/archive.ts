// ─────────────────────────────────────────────────────────────────────────────
// Consistent client-side ZIP archive validation.
//
// The backend is authoritative — it enforces its own body limit and rejects
// unsafe archives during extraction. These checks exist only so the console
// fails fast and honestly instead of uploading hundreds of megabytes that the
// backend is guaranteed to refuse.
//
// The limit mirrors the frozen backend's Fastify `bodyLimit` / multipart
// `fileSize` of 200 MB. It is never used to claim an upload succeeded.
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum archive size accepted by the frozen backend (200 MB). */
export const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;

/** Human-readable form of {@link MAX_ARCHIVE_BYTES}. */
export const MAX_ARCHIVE_LABEL = "200 MB";

export interface ValidateArchiveOptions {
  /**
   * Message used when the file is not a `.zip`. Kept configurable because
   * different surfaces phrase this differently (analysis vs. execution).
   */
  extensionMessage?: string;
}

/**
 * Validate a user-selected archive.
 *
 * @returns an error message when the file must be rejected, or `null` when it
 *          is acceptable to send to the backend.
 */
export function validateArchive(
  file: File,
  options: ValidateArchiveOptions = {},
): string | null {
  const {
    extensionMessage = "Only .zip archives are accepted.",
  } = options;

  if (!isZipFile(file.name)) return extensionMessage;

  if (file.size === 0) {
    return "That archive is empty (0 bytes). Select a ZIP that contains your project.";
  }

  if (file.size > MAX_ARCHIVE_BYTES) {
    return `That archive is larger than the ${MAX_ARCHIVE_LABEL} limit the backend accepts. Select a smaller archive.`;
  }

  return null;
}

/** True when a filename carries the `.zip` extension. */
export function isZipFile(name: string): boolean {
  return name.toLowerCase().endsWith(".zip");
}

/**
 * Light pre-flight check for repository URLs. The backend performs the real
 * validation — this only prevents obviously malformed submissions.
 */
export function validateRepositoryUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a repository URL.";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Enter a full URL, e.g. https://github.com/owner/repo";
  }

  if (parsed.protocol !== "https:") {
    return "Only HTTPS repository URLs are accepted.";
  }

  return null;
}
