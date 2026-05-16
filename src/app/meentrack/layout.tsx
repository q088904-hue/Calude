import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MeenTrack — AI Fish Finder",
  description:
    "AI-powered fishing assistant for South Indian fishermen. Find fish, stay safe, earn more.",
};

export default function MeenTrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Scoped to the MeenTrack marine palette — does not bleed into other routes
    <div className="min-h-dvh bg-mt-bg text-mt-ink">
      {children}
    </div>
  );
}
