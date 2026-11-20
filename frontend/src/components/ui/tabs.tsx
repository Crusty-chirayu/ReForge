"use client";

import React, { createContext, useContext } from "react";

interface TabsContextValue {
  selected: string;
  onSelect: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue>({
  selected: "",
  onSelect: () => {},
});

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className = "" }: TabsProps) {
  return (
    <TabsContext.Provider value={{ selected: value, onSelect: onValueChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function TabList({ children, className = "", "aria-label": ariaLabel }: TabListProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 border-b border-border-subtle overflow-x-auto ${className}`}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function TabTrigger({ value, children, icon, badge, className = "" }: TabTriggerProps) {
  const { selected, onSelect } = useContext(TabsContext);
  const isActive = selected === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onSelect(value)}
      className={[
        "relative flex items-center gap-2 px-3 py-2 text-ui-dense font-medium transition-colors duration-120 whitespace-nowrap outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas",
        isActive
          ? "text-text-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-raised",
        className,
      ].join(" ")}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && <span className="shrink-0">{badge}</span>}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className = "" }: TabContentProps) {
  const { selected } = useContext(TabsContext);
  if (selected !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`outline-none pt-4 ${className}`}
    >
      {children}
    </div>
  );
}
