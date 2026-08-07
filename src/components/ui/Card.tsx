import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
}: CardProps) {
  const paddings: Record<string, string> = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-7",
  };

  return (
    <div
      className={`bg-background rounded-xl shadow-md border border-border ${
        hover
          ? "transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
          : ""
      } ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
