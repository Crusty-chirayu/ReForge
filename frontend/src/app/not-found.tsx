import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NAV_ITEMS } from "@/lib/navigation";

export const metadata = {
  title: "Page not found",
};

/**
 * 404 surface for URLs that do not map to a route.
 *
 * Rather than a dead end, it lists the console's real destinations so a
 * mistyped or stale deep link always has a recovery path.
 */
export default function NotFound() {
  return (
    <div className="space-y-4">
      <Card padding="lg">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-ink-border/60 bg-ink-2/60 text-ink-muted"
            >
              <Compass className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-ink-fg">
                No such page
              </h1>
              <p className="mt-1 max-w-prose text-xs text-ink-muted">
                This URL does not match any route in the ReForge console. If you
                followed a link to a pipeline or snapshot, the identifier may be
                incomplete — open it from the dashboard or Snapshot Explorer
                instead.
              </p>
            </div>
          </div>

          <nav aria-label="Console destinations" className="w-full">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-2 rounded border border-ink-border/40 bg-ink-1/40 px-3 py-2 transition-colors hover:border-steel/30 hover:bg-steel/5"
                    >
                      <Icon
                        size={13}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-steel"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-ink-fg">
                          {item.label}
                        </span>
                        <span className="block text-[10px] text-ink-subtle">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </Card>
    </div>
  );
}
