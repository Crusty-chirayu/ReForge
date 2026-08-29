"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Route-level error boundary.
 *
 * Renders when a client component throws during render. It deliberately shows
 * only the error's message and Next.js digest — never a stack trace, never a
 * filesystem path — and always offers a way out of the broken state.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Surfaced in the browser console for developers; not shown to the user.
    console.error("ReForge route error:", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <Card padding="lg">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-rose-500/30 bg-rose-500/10 text-rose-400"
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-rose-400">
                This view failed to render
              </h1>
              <p className="mt-1 max-w-prose text-xs text-ink-muted">
                Something went wrong while building this page in your browser.
                Your analysis data has not been altered — retrying re-renders
                the view, and the dashboard is always reachable.
              </p>
            </div>
          </div>

          {error.digest && (
            <div className="w-full rounded border border-ink-border/40 bg-ink-0/60 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                Error reference
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                {error.digest}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="forge"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={reset}
            >
              Try again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Home className="h-3.5 w-3.5" />}
              onClick={() => router.push("/")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
