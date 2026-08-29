import { AlertTriangle, CheckCircle2, Quote, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Mono } from "@/components/ui/mono";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import type {
  BrainInference,
  BrainResponse,
  Evidence,
} from "@/lib/api/types";

const confidenceVariant: Record<BrainResponse["confidence"], StatusVariant> = {
  HIGH: "succeeded",
  MEDIUM: "warning",
  LOW: "muted",
};

/** Render the answer text as paragraphs (the backend returns plain text). */
function AnswerBlock({ answer }: { answer: string }) {
  const paragraphs = answer.split("\n\n").filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="text-sm leading-relaxed text-ink-fg"
        >
          {p}
        </p>
      ))}
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {evidence.map((ev, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded border border-steel/20 bg-steel/5 px-2.5 py-1.5"
        >
          <Quote size={10} className="mt-0.5 shrink-0 text-steel" />
          <div className="min-w-0 font-mono text-[11px] text-ink-muted">
            <span className="text-steel">{ev.file}</span>
            <span className="text-ink-subtle">: </span>
            {ev.detail}
          </div>
        </div>
      ))}
    </div>
  );
}

function InferenceBadge({ inference }: { inference: BrainInference }) {
  return (
    <div className="flex items-start gap-2 rounded border border-ink-border/20 bg-ink-1/30 px-2.5 py-2">
      <Sparkles size={11} className="mt-0.5 shrink-0 text-amber-400" />
      <div className="min-w-0">
        <p className="text-xs text-ink-fg">{inference.statement}</p>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
          inference · {inference.confidence} confidence · unverified
        </p>
      </div>
    </div>
  );
}

/**
 * Renders a real BrainResponse, keeping ANSWER / EVIDENCE / LIMITATIONS
 * visually distinct and never overstating certainty.
 */
export function BrainResponseView({ response }: { response: BrainResponse }) {
  return (
    <div className="space-y-4" data-testid="brain-response">
      {/* Answer */}
      <Card padding="none">
        <CardHeader
          title="Answer"
          subtitle={`${response.confidence} confidence${response.contextTruncated ? " · context truncated" : ""}`}
          action={
            <StatusBadge variant={confidenceVariant[response.confidence]}>
              {response.confidence}
            </StatusBadge>
          }
        />
        <div className="px-5 pb-5">
          <AnswerBlock answer={response.answer} />
        </div>
      </Card>

      {/* Evidence — distinct, evidence-first */}
      {response.evidence.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Evidence"
            subtitle={`${response.evidence.length} cited item${response.evidence.length === 1 ? "" : "s"} — grounded in the deterministic report`}
          />
          <div className="px-4 pb-4">
            <EvidenceList evidence={response.evidence} />
          </div>
        </Card>
      )}

      {/* Inferences — unverified AI statements */}
      {response.inferences.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Inferences"
            subtitle="AI-generated statements — not verified against deterministic facts"
          />
          <div className="space-y-1.5 px-4 pb-4">
            {response.inferences.map((inf, i) => (
              <InferenceBadge
                key={i}
                inference={inf}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Limitations — prominent */}
      {response.limitations.length > 0 && (
        <Card padding="none" className="border-amber-500/20 bg-amber-500/5">
          <CardHeader
            title="Limitations"
            subtitle="Boundaries of this answer"
            action={<AlertTriangle size={14} className="text-amber-400" />}
          />
          <ul className="space-y-1.5 px-4 pb-4">
            {response.limitations.map((lim) => (
              <li
                key={lim}
                className="flex items-start gap-2 text-xs text-ink-muted"
              >
                <AlertTriangle
                  size={10}
                  className="mt-0.5 shrink-0 text-amber-400"
                />
                {lim}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Context used */}
      {response.contextUsed.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            context
          </span>
          {response.contextUsed.map((ctx) => (
            <Mono
              key={ctx}
              className="border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 text-[9px] text-ink-muted"
            >
              {ctx}
            </Mono>
          ))}
          {response.contextTruncated && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
              <CheckCircle2 size={9} />
              truncated
            </span>
          )}
        </div>
      )}
    </div>
  );
}
