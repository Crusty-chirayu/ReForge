// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers for technical identifiers and timestamps.
// ─────────────────────────────────────────────────────────────────────────────

/** Truncate a technical identifier with an ellipsis. */
export function shortId(id: string, length = 8): string {
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
