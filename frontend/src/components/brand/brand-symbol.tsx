import React from "react";

export interface BrandSymbolProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * ReForge brand symbol:
 * A square-cornered "R" built from two offset horizontal bars (one removed/outline,
 * one added/solid ember) bent into an R stem — a diff glyph representing transformation.
 */
export function BrandSymbol({ size = 20, className = "", ...props }: BrandSymbolProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* Left vertical spine */}
      <rect x="3" y="3" width="3.5" height="18" rx="0.5" fill="currentColor" />

      {/* Top horizontal removed bar (diff-remove / transformation origin) */}
      <rect
        x="6.5"
        y="3"
        width="11"
        height="3"
        rx="0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />

      {/* Top right corner turn */}
      <path
        d="M17.5 3H19.5V11.5H17.5V3Z"
        fill="currentColor"
        fillOpacity="0.8"
      />

      {/* Middle horizontal added bar (ember accent / transformation applied) */}
      <rect
        x="6.5"
        y="9.5"
        width="12"
        height="3.5"
        rx="0.5"
        fill="var(--accent, #F2672A)"
      />

      {/* Diagonal lower right kick/stem of the R */}
      <path
        d="M12.5 13H15.5L19.5 21H15.5L12.5 13Z"
        fill="currentColor"
      />
    </svg>
  );
}
