// Product-grade surface card (twenty.com-style): white surface, 1px light-gray
// border, soft elevation, 6px radius. Single source of truth for the card recipe
// repeated across Stagecraft surfaces. Presentational only.

type CardSize = "sm" | "md" | "lg";

const PADDING: Record<CardSize, string> = {
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

const RADIUS: Record<CardSize, string> = {
  sm: "rounded-sc-sm",
  md: "rounded-sc",
  lg: "rounded-sc-lg",
};

export function Card({
  as: Tag = "div",
  interactive = false,
  size = "md",
  className = "",
  children,
}: {
  as?: "div" | "article" | "li";
  interactive?: boolean;
  size?: CardSize;
  className?: string;
  children: React.ReactNode;
}) {
  const base = `bg-sc-surface border border-sc-border shadow-sc-sm ${RADIUS[size]} ${PADDING[size]}`;
  // Interactive cards lift + deepen shadow on hover/focus. The translate is
  // motion; the motion-reduce variant drops it (shadow change is retained,
  // which is a non-motion property).
  const interactiveClasses = interactive
    ? "transition-shadow duration-150 ease-sc hover:shadow-sc-md focus-within:shadow-sc-md hover:-translate-y-px motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
    : "";

  return (
    <Tag className={`${base} ${interactiveClasses} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
