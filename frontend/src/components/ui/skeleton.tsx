import type { CSSProperties } from "react";

export interface SkeletonProps {
  className?: string;
  rows?: number;
  width?: string;
  height?: string;
}

export function Skeleton({
  className = "",
  rows = 1,
  width,
  height,
}: SkeletonProps) {
  const style: CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  if (rows > 1) {
    return (
      <div
        className={["flex flex-col gap-2", className].join(" ")}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ ...style, width: i === rows - 1 ? "60%" : "100%" }}
          />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return <div className={["skeleton", className].join(" ")} style={style} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded border border-ink-border/60 bg-ink-card/80 p-4",
        className,
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-24 skeleton" />
        <div className="h-5 w-16 rounded-full skeleton" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full skeleton" />
        <div className="h-3 w-3/4 skeleton" />
        <div className="h-3 w-1/2 skeleton" />
      </div>
    </div>
  );
}
