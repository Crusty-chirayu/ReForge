import React from "react";

export function Kbd({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded border border-border-default bg-bg-raised px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-secondary select-none ${className}`}
    >
      {children}
    </kbd>
  );
}
