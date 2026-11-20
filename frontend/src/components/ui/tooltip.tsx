"use client";

import React, { useState, useRef, useEffect, useId } from "react";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  delay?: number;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  content,
  children,
  delay = 400,
  position = "top",
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const show = () => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };

  const child = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(e);
      hide();
    },
    "aria-describedby": visible ? tooltipId : undefined,
  });

  return (
    <div className="relative inline-flex items-center">
      {child}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={[
            "absolute z-50 whitespace-nowrap rounded-[4px] border border-border-default bg-bg-overlay px-2 py-1 font-mono text-[11px] text-text-primary shadow-overlay pointer-events-none transition-opacity duration-120",
            positionClasses[position],
            className,
          ].join(" ")}
        >
          {content}
        </div>
      )}
    </div>
  );
}
