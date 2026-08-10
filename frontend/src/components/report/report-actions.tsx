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
    route: "/pipeline/new",
    comingSoon: false,
  },
] as const;

/**
 * Next-step workflow actions. Plan / Novelty / Impact / Pipeline are live
 * workflows; Snapshots detail arrives in a later phase.
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
          {ACTIONS.map((action) => (
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
          ))}
        </div>
        <p className="px-4 pb-4 text-[10px] text-ink-subtle">
          Snapshots detail lands in a later phase.
        </p>
      </Card>
    </section>
  );
}
