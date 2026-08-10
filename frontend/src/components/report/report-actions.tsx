"use client";

import { useRouter } from "next/navigation";
import { Activity, ChevronRight, Sparkles, Target, Zap } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "./sections";

const ACTIONS = [
  {
    label: "Create Improvement Plan",
    icon: Target,
    route: "/plan",
    comingSoon: false,
  },
  {
    label: "Analyze Change Impact",
    icon: Activity,
    route: "/impact",
    comingSoon: false,
  },
  {
    label: "Explore Novelty",
    icon: Sparkles,
    route: "/novelty",
    comingSoon: false,
  },
  {
    label: "Run Pipeline",
    icon: Zap,
    route: "/pipeline",
    comingSoon: true,
  },
] as const;

/**
 * Next-step workflow actions. Plan / Novelty / Impact are live workflows in
 * F4; Run Pipeline ships in a later phase and stays clearly marked as
 * "coming next" (no placeholder pages are created).
 */
export function ReportActions() {
  const router = useRouter();

  return (
    <section id="next-steps" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="06 · Next Steps" title="Continue the workflow" />
      <Card padding="none">
        <CardHeader
          title="Intelligence Workflows"
          subtitle="Your report is preserved in memory and is reused by each workflow automatically"
        />
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((action) =>
            action.comingSoon ? (
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
            ) : (
              <Button
                key={action.route}
                variant="muted"
                icon={<action.icon size={13} />}
                iconRight={<ChevronRight size={12} />}
                className="w-full justify-start hover:border-steel/30 hover:text-steel"
                onClick={() => router.push(action.route)}
              >
                {action.label}
              </Button>
            ),
          )}
        </div>
        <p className="px-4 pb-4 text-[10px] text-ink-subtle">
          Run Pipeline lands in a later phase — no placeholder pages created.
        </p>
      </Card>
    </section>
  );
}
