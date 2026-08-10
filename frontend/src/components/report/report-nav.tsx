const LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#code", label: "Code" },
  { href: "#dependencies", label: "Dependencies" },
  { href: "#doctor", label: "Doctor" },
  { href: "#risks", label: "Risks" },
  { href: "#next-steps", label: "Next Steps" },
] as const;

/** Sticky in-page navigation for the analysis report (desktop-oriented). */
export function ReportNav() {
  return (
    <nav
      aria-label="Report sections"
      className="sticky top-0 z-10 overflow-x-auto rounded border border-ink-border/40 bg-ink-0/85 px-1 py-1.5 backdrop-blur-sm"
    >
      <div className="flex min-w-max gap-0.5">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted transition-colors hover:bg-ink-1 hover:text-ink-fg"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
