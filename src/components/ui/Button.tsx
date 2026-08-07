import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref,
  ) {
    const base =
      "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";

    const variants: Record<string, string> = {
      primary:
        "bg-accent text-white hover:opacity-90 hover:-translate-y-px shadow-md",
      secondary:
        "border-2 border-primary text-primary hover:bg-primary hover:text-on-primary",
      ghost: "text-foreground hover:bg-muted",
    };

    const sizes: Record<string, string> = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-5 py-2.5 text-base gap-2",
      lg: "px-7 py-3.5 text-lg gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
