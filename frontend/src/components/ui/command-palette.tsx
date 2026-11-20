"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Compass,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Target,
  Brain,
  Wrench,
  Zap,
  FolderArchive,
  Settings,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Kbd } from "./kbd";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  section: "Navigate" | "Actions" | "Theme";
  icon: React.ComponentType<{ size: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  perform: () => void;
  keywords?: string[];
}

export function CommandPalette({
  open,
  onClose,
  onOpenSettings,
  onOpenShowcase,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  onOpenShowcase?: () => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav-overview",
        title: "Overview",
        subtitle: "Project timeline and summary",
        section: "Navigate",
        icon: LayoutDashboard,
        perform: () => navigateTo("/"),
        keywords: ["dashboard", "home", "start"],
      },
      {
        id: "nav-ingest",
        title: "Ingest",
        subtitle: "Upload ZIP or import GitHub repository",
        section: "Navigate",
        icon: Compass,
        perform: () => navigateTo("/analyze"),
        keywords: ["analyze", "upload", "zip", "github"],
      },
      {
        id: "nav-report",
        title: "Report",
        subtitle: "Comprehensive analysis report",
        section: "Navigate",
        icon: FileText,
        perform: () => navigateTo("/analyze/report"),
        keywords: ["analysis", "overview", "findings"],
      },
      {
        id: "nav-xray",
        title: "Project X-Ray",
        subtitle: "Architecture tree, coupling matrix, and focus graph",
        section: "Navigate",
        icon: Layers,
        perform: () => navigateTo("/xray"),
        keywords: ["structure", "graph", "modules", "dependencies"],
      },
      {
        id: "nav-doctor",
        title: "Project Doctor",
        subtitle: "Evidence-backed health findings",
        section: "Navigate",
        icon: Activity,
        perform: () => navigateTo("/doctor"),
        keywords: ["health", "rules", "diagnostics", "code quality"],
      },
      {
        id: "nav-impact",
        title: "Impact Analysis",
        subtitle: "Model change blast radius and relationships",
        section: "Navigate",
        icon: Activity,
        perform: () => navigateTo("/impact"),
        keywords: ["blast radius", "dependencies", "risks"],
      },
      {
        id: "nav-plan",
        title: "Planning",
        subtitle: "Sequenced improvement tasks and DAG",
        section: "Navigate",
        icon: Target,
        perform: () => navigateTo("/plan"),
        keywords: ["tasks", "execution", "roadmap"],
      },
      {
        id: "nav-brain",
        title: "Project Brain",
        subtitle: "Repository-grounded AI consultation",
        section: "Navigate",
        icon: Brain,
        perform: () => navigateTo("/brain"),
        keywords: ["query", "llm", "ai", "ask"],
      },
      {
        id: "nav-builder",
        title: "Builder",
        subtitle: "Diff inspection, approval, and execution",
        section: "Navigate",
        icon: Wrench,
        perform: () => navigateTo("/build"),
        keywords: ["patch", "diff", "apply", "execute"],
      },
      {
        id: "nav-pipelines",
        title: "Pipelines",
        subtitle: "Autonomous runs and execution history",
        section: "Navigate",
        icon: Zap,
        perform: () => navigateTo("/pipeline"),
        keywords: ["runs", "workflows", "history"],
      },
      {
        id: "nav-snapshots",
        title: "Snapshots",
        subtitle: "Versioned states and comparisons",
        section: "Navigate",
        icon: FolderArchive,
        perform: () => navigateTo("/snapshots"),
        keywords: ["history", "compare", "versions"],
      },
      {
        id: "nav-novelty",
        title: "Novelty Analysis",
        subtitle: "Surface differentiating product opportunities",
        section: "Navigate",
        icon: Sparkles,
        perform: () => navigateTo("/novelty"),
        keywords: ["opportunities", "differentiation"],
      },
      {
        id: "nav-settings",
        title: "Settings",
        subtitle: "Theme, preferences, and provider status",
        section: "Navigate",
        icon: Settings,
        perform: () => {
          if (onOpenSettings) {
            onClose();
            onOpenSettings();
          } else {
            navigateTo("/settings");
          }
        },
        keywords: ["config", "theme", "keys", "providers"],
      },
      ...(onOpenShowcase
        ? [
            {
              id: "action-showcase",
              title: "Design Showcase",
              subtitle: "Interactive tokens, components, and state rail matrix",
              section: "Actions" as const,
              icon: Sparkles,
              perform: () => {
                onClose();
                onOpenShowcase();
              },
              keywords: ["showcase", "components", "design", "tokens"],
            },
          ]
        : []),

      // Theme Actions
      {
        id: "theme-dark",
        title: "Theme: Dark",
        subtitle: "Switch to dark mode",
        section: "Theme",
        icon: Moon,
        perform: () => {
          setTheme("dark");
          onClose();
        },
      },
      {
        id: "theme-light",
        title: "Theme: Light",
        subtitle: "Switch to light mode",
        section: "Theme",
        icon: Sun,
        perform: () => {
          setTheme("light");
          onClose();
        },
      },
      {
        id: "theme-system",
        title: "Theme: System",
        subtitle: "Follow OS preference",
        section: "Theme",
        icon: Laptop,
        perform: () => {
          setTheme("system");
          onClose();
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose],
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.subtitle?.toLowerCase().includes(lower) ||
        c.keywords?.some((k) => k.toLowerCase().includes(lower)),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((idx) => (idx + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (idx) =>
            (idx - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length),
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.perform();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, filteredCommands, selectedIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface */}
      <div className="relative z-10 w-full max-w-xl rounded-[8px] border border-border-default bg-bg-surface shadow-overlay overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 border-b border-border-subtle px-3 py-2.5 bg-bg-raised">
          <Search size={16} className="text-text-tertiary shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or jump to page..."
            className="w-full bg-transparent text-ui-dense text-text-primary placeholder:text-text-tertiary outline-none"
            aria-label="Command search"
          />
          <Kbd>ESC</Kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 font-sans">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-meta text-text-tertiary">
              No matching commands found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const IconComponent = cmd.icon;

              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.perform}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={[
                    "flex w-full items-center justify-between rounded-[4px] px-2.5 py-2 text-left transition-colors duration-100 outline-none",
                    isSelected
                      ? "bg-accent-subtle/50 text-text-primary border-l-2 border-l-accent"
                      : "text-text-secondary hover:bg-bg-raised hover:text-text-primary",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComponent
                      size={15}
                      className={isSelected ? "text-accent" : "text-text-tertiary"}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <span className="text-ui-dense font-medium text-text-primary block truncate">
                        {cmd.title}
                      </span>
                      {cmd.subtitle && (
                        <span className="text-[11px] text-text-tertiary block truncate">
                          {cmd.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-text-tertiary shrink-0 ml-2">
                    {cmd.section}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between border-t border-border-subtle bg-bg-surface px-3 py-1.5 font-mono text-[10px] text-text-tertiary">
          <div className="flex items-center gap-2">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
            </span>
            <span>
              <Kbd>↵</Kbd> select
            </span>
          </div>
          <span>ReForge Command Bar</span>
        </div>
      </div>
    </div>
  );
}
