import type { Metadata } from "next";

// Stabilization OBS-4: give every /stagecraft route a Stagecraft-specific title
// instead of inheriting the generic Datamatics root title. Client pages can't
// export metadata, so this segment default applies across the SPA; pages may
// still refine via the "%s · Stagecraft" template if a server title is added.
export const metadata: Metadata = {
  title: { default: "Stagecraft", template: "%s · Stagecraft" },
};

export default function StagecraftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
