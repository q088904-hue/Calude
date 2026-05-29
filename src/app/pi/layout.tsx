import type { ReactNode } from "react";

export default function PiLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">{children}</div>;
}
