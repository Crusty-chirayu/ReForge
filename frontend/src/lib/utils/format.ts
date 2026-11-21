// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers for technical identifiers and timestamps.
// ─────────────────────────────────────────────────────────────────────────────

/** Truncate a technical identifier with an ellipsis. Safe on undefined. */
export function shortId(id: string | undefined | null, length = 8): string {
  if (!id) return "";
  if (id.length <= length) return id;
  return `${id.slice(0, length)}…`;
}

/** Compact localized timestamp, e.g. "Aug 10, 2026, 10:32 PM". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative human timestamp, e.g. "just now", "5m ago", "2h ago", "3d ago". */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Locale-formatted number, e.g. 12_400 → "12,400". */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/** Human-readable byte size, e.g. 1_024_000 → "1.0 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** i;
  const display =
    i === 0 || value >= 100 ? Math.round(value).toString() : value.toFixed(1);
  return `${display} ${units[i]}`;
}

/** Stopwatch-style elapsed time, e.g. 83 → "1:23". */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
