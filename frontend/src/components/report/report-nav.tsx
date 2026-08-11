const LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#code", label: "Code" },
  { href: "#dependencies", label: "Dependencies" },
  { href: "#doctor", label: "Doctor" },
  { href: "#risks", label: "Risks" },
  { href: "#next-steps", label: "Next Steps" },
] as const;

/**
 * In-page navigation for the analysis report.
 *
 * Sticks below the console header on wide viewports and scrolls with the page
 * on small ones, so it can never cover the content it links to. Each link is a
 * real anchor, so keyboard and browser history both behave normally.
 */
export function ReportNav() {
  return (
    <nav
      aria-label="Report sections"
      className="-mx-1 overflow-x-auto rounded border border-ink-border/40 bg-ink-0/85 px-1 py-1.5 backdrop-blur-sm sm:sticky sm:top-0 sm:z-20"
    >
      <ul className="flex min-w-max gap-0.5">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="block rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted transition-colors hover:bg-ink-1 hover:text-ink-fg"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
