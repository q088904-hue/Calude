"use client";

// LockedFeatureCard — inline paywall shown when user taps a Pro feature
// Single tap target, one message, one CTA. No modal until they tap.

import { Lock } from "lucide-react";
import { Feature } from "@/lib/payments/types";
import { getPaywallCopy, Locale, FEATURE_DISPLAY_NAMES } from "@/lib/i18n/paywall";

interface Props {
  featureId: Feature;
  locale?: Locale;
  /** Description of what this feature does — shown below the name */
  description?: string;
  /** Compact mode for 2-column grid cells — tighter layout, shorter CTA */
  compact?: boolean;
  onCta: () => void;
}

export function LockedFeatureCard({
  featureId,
  locale = "en",
  description,
  compact = false,
  onCta,
}: Props) {
  const c = getPaywallCopy(locale);
  const featureName =
    FEATURE_DISPLAY_NAMES[featureId]?.[locale] ??
    FEATURE_DISPLAY_NAMES[featureId]?.["en"] ??
    featureId;

  if (compact) {
    return (
      <button
        onClick={onCta}
        className="w-full h-full text-left bg-[#0F1E33] border border-[#1A2E4A] rounded-2xl p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform"
      >
        <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center">
          <Lock className="w-4 h-4 text-[#00E5FF]" />
        </div>
        <p className="text-[#F5F9FF] font-semibold text-sm leading-snug">{featureName}</p>
        {description && (
          <p className="text-[#8FA3BF] text-xs leading-snug">{description}</p>
        )}
        <p className="text-[#00E5FF] text-xs font-semibold mt-auto pt-1">{c.lockedCta}</p>
      </button>
    );
  }

  return (
    <button
      onClick={onCta}
      className="w-full text-left bg-[#0F1E33] border border-[#1A2E4A] rounded-2xl p-5 flex flex-col gap-3 active:scale-[0.98] transition-transform"
    >
      {/* Lock badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-[#00E5FF]" />
        </div>
        <div>
          <p className="text-[#F5F9FF] font-semibold text-base">{featureName}</p>
          {description && (
            <p className="text-[#8FA3BF] text-sm leading-snug mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* CTA row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[#8FA3BF] text-sm leading-snug">{c.lockedSubhead(featureName)}</p>
        <span className="text-[#00E5FF] text-sm font-semibold whitespace-nowrap flex-shrink-0">
          {c.lockedCta}
        </span>
      </div>
    </button>
  );
}

export default LockedFeatureCard;
