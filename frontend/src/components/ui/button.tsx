import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "forge" | "steel" | "ghost" | "danger" | "muted";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  forge:
    "bg-forge text-forge-fg hover:bg-forge-dim active:bg-forge-dim/80 shadow-glow-sm hover:shadow-glow border border-forge/30",
  steel:
    "bg-steel text-steel-fg hover:bg-steel-dim active:bg-steel-dim/80 shadow-steel-sm hover:shadow-steel border border-steel/30",
  ghost:
    "bg-transparent text-ink-fg hover:bg-ink-2 active:bg-ink-3 border border-transparent hover:border-ink-border/50",
  danger:
    "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 active:bg-rose-500/35 border border-rose-500/25",
  muted:
    "bg-ink-2 text-ink-muted hover:bg-ink-3 hover:text-ink-fg active:bg-ink-3 border border-ink-border/50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-[11px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "forge",
      size = "md",
      loading = false,
      icon,
      iconRight,
      className = "",
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          "inline-flex items-center justify-center rounded font-medium transition-all duration-150",
          "select-none disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : icon ? (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
