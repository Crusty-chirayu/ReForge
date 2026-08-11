"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  Brain,
  ChevronRight,
  FolderArchive,
  Sparkles,
  Target,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "./sections";

interface ReportAction {
  label: string;
  icon: LucideIcon;
  route: string;
  detail: string;
}

/**
 * Every next step is a live route. Nothing here is gated, planned, or
 * "coming soon" — if it is listed, it works today.
 */
const ACTIONS: ReportAction[] = [
  {
    label: "Create Improvement Plan",
    icon: Target,
    route: "/plan",
    detail: "Sequence the work into tasks",
  },
  {
    label: "Analyze Change Impact",
    icon: Activity,
    route: "/impact",
    detail: "Model the blast radius of a change",
  },
  {
    label: "Explore Novelty",
    icon: Sparkles,
    route: "/novelty",
    detail: "Find differentiating opportunities",
  },
  {
    label: "Generate Build Plan",
    icon: Wrench,
    route: "/build",
    detail: "Draft a reviewable patch proposal",
  },
  {
    label: "Ask Project Brain",
    icon: Brain,
    route: "/brain",
    detail: "Question the evidence directly",
  },
  {
    label: "Run Pipeline",
    icon: Zap,
    route: "/pipeline/new",
    detail: "Execute end-to-end with verification",
  },
  {
    label: "Browse Snapshots",
    icon: FolderArchive,
    route: "/snapshots",
    detail: "Compare versioned project state",
  },
];

/** Next-step workflow actions from the analysis report. */
export function ReportActions() {
  const router = useRouter();

  return (
    <section id="next-steps" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="06 · Next Steps" title="Continue the workflow" />
      <Card padding="none">
        <CardHeader
          title="Intelligence Workflows"
          subtitle="Your report stays loaded for this tab and is reused by each workflow automatically"
        />
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.route}
                variant="muted"
                icon={<Icon size={13} />}
                iconRight={<ChevronRight size={12} />}
                title={action.detail}
                className="h-auto w-full justify-start py-2 text-left hover:border-steel/30 hover:text-steel"
                onClick={() => router.push(action.route)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{action.label}</span>
                  <span className="block truncate text-[10px] font-normal text-ink-subtle">
                    {action.detail}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
