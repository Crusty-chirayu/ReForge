import type { HTMLAttributes, ReactNode } from "react";

export interface MonoProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  truncate?: boolean;
}

/** Technical monospace text utility — the console's default for IDs, paths, and values. */
export function Mono({
  children,
  className = "",
  truncate = false,
  ...props
}: MonoProps) {
  return (
    <span
      className={[
        "font-mono text-[11px] leading-none tracking-wide text-steel",
        "rounded px-1 -mx-1",
        truncate ? "inline-block max-w-full truncate" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export interface CopyableProps {
  value: string;
  label?: string;
  className?: string;
}

export function Copyable({ value, label, className = "" }: CopyableProps) {
  return (
    <span className={className}>
      {label && (
        <span className="mr-1 text-[10px] uppercase tracking-wider text-ink-subtle">
          {label}
        </span>
      )}
      <Mono>{value}</Mono>
    </span>
  );
}
