import { Activity, Sparkles, Target, Zap } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "./sections";

const ACTIONS = [
  { label: "Create Improvement Plan", icon: Target, route: "/plan" },
  { label: "Analyze Change Impact", icon: Activity, route: "/impact" },
  { label: "Explore Novelty", icon: Sparkles, route: "/novelty" },
  { label: "Run Pipeline", icon: Zap, route: "/pipeline" },
] as const;

/**
 * Next-step workflow actions. The destination pages ship in upcoming phases;
 * until they exist, each action is rendered disabled with a clear
 * "coming next" tag (no placeholder pages are created).
 */
export function ReportActions() {
  return (
    <section id="next-steps" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="06 · Next Steps" title="Continue the workflow" />
      <Card padding="none">
        <CardHeader
          title="Intelligence Workflows"
          subtitle="Your report is preserved in memory and will be reused by these workflows"
        />
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((action) => (
            <Button
              key={action.route}
              variant="muted"
              disabled
              icon={<action.icon size={13} />}
              className="w-full justify-start"
              aria-label={`${action.label} — coming next`}
            >
              {action.label}
              <span className="ml-auto rounded border border-ink-border/40 px-1 py-px font-mono text-[8px] uppercase tracking-wider text-ink-subtle">
                coming next
              </span>
            </Button>
          ))}
        </div>
        <p className="px-4 pb-4 text-[10px] text-ink-subtle">
          Destinations land in upcoming phases — no placeholder pages created.
        </p>
      </Card>
    </section>
  );
}
