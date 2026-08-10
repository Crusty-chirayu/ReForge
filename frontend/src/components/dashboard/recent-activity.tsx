import { Card, CardHeader } from "@/components/ui/card";
import type {
  PipelineExecutionSummary,
  ProjectHistoryItem,
} from "@/lib/api/types";
import { deriveActivityFeed } from "@/lib/utils/activity";
import { formatRelativeTime } from "@/lib/utils/format";

export interface RecentActivityProps {
  projectItems: ProjectHistoryItem[];
  pipelineItems: PipelineExecutionSummary[];
}

/**
 * Compact activity feed derived from real project/pipeline history.
 * Renders nothing when there is no activity.
 */
export function RecentActivity({
  projectItems,
  pipelineItems,
}: RecentActivityProps) {
  const feed = deriveActivityFeed(projectItems, pipelineItems, 6);
  if (feed.length === 0) return null;

  return (
    <Card padding="none">
      <CardHeader
        title="Recent Activity"
        subtitle={`${feed.length} latest event${feed.length === 1 ? "" : "s"} across snapshots and pipelines`}
      />
      <div className="px-4 pb-4" data-testid="recent-activity">
        <ul className="space-y-1">
          {feed.map((event) => (
            <li
              key={`${event.kind}-${event.id}`}
              className="flex items-center gap-3 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2"
            >
              <span
                aria-hidden="true"
                className={[
                  "h-2 w-2 shrink-0 rounded-full",
                  event.kind === "pipeline" ? "bg-forge" : "bg-steel",
                ].join(" ")}
              />
              <span
                className={[
                  "shrink-0 font-mono text-[9px] uppercase tracking-widest",
                  event.kind === "pipeline" ? "text-forge" : "text-steel",
                ].join(" ")}
              >
                {event.kind}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink-fg">
                {event.label}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-ink-subtle">
                {formatRelativeTime(event.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
