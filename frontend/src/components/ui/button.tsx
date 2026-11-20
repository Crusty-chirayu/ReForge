import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "forge"
  | "steel"
  | "muted";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  "aria-label"?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  // Forge Ledger specification with backward compatible classes
  primary:
    "bg-accent bg-forge text-on-accent text-forge-fg hover:bg-accent-hover active:bg-accent-hover/90 border border-transparent font-medium",
  forge:
    "bg-forge bg-accent text-forge-fg text-on-accent hover:bg-forge-dim active:bg-forge-dim/80 border border-forge/30 font-medium",
  secondary:
    "bg-bg-surface text-text-primary hover:bg-bg-raised active:bg-bg-overlay border border-border-default hover:border-border-strong",
  steel:
    "bg-steel text-steel-fg hover:bg-steel-dim border border-steel/30",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-raised active:bg-bg-overlay border border-transparent",
  danger:
    "bg-critical/10 text-critical hover:bg-critical/20 active:bg-critical/30 border border-critical/30",
  muted:
    "bg-bg-raised text-text-secondary hover:text-text-primary hover:bg-bg-overlay active:bg-bg-overlay border border-border-subtle",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-meta gap-1.5 rounded-[4px]",
  md: "h-9 px-3.5 text-ui-dense gap-2 rounded-[6px]",
  lg: "h-11 px-5 text-body-dense gap-2.5 rounded-[6px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
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
          "inline-flex items-center justify-center font-sans transition-all duration-120",
          "select-none disabled:cursor-not-allowed disabled:opacity-50 outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas",
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
          <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
