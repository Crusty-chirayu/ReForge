import React from "react";
import { BrandSymbol } from "./brand-symbol";

export interface BrandWordmarkProps {
  showSymbol?: boolean;
  symbolSize?: number;
  className?: string;
}

export function BrandWordmark({
  showSymbol = true,
  symbolSize = 18,
  className = "",
}: BrandWordmarkProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {showSymbol && (
        <span className="flex items-center justify-center text-text-primary">
          <BrandSymbol size={symbolSize} />
        </span>
      )}
      <span className="font-sans font-semibold tracking-tight text-sm inline-flex items-baseline">
        <span className="text-text-secondary">Re</span>
        <span className="text-text-primary">Forge</span>
      </span>
    </div>
  );
}
