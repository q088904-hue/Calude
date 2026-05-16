"use client";

// TrialCountdown — nav-bar chip showing days remaining in trial
// Visible in bottom nav during trial; tapping opens the subscription modal

import { motion } from "framer-motion";
import { getPaywallCopy, Locale } from "@/lib/i18n/paywall";

interface Props {
  daysLeft: number;
  locale?: Locale;
  onClick: () => void;
}

export function TrialCountdown({ daysLeft, locale = "en", onClick }: Props) {
  const c = getPaywallCopy(locale);

  const label = daysLeft === 0 ? c.trialEndsToday : c.trialDaysLeft(daysLeft);

  // Urgency colour: amber when 2 days left, red when today
  const chipColor =
    daysLeft === 0
      ? "bg-[#FF3B30]/20 border-[#FF3B30]/40 text-[#FF3B30]"
      : daysLeft <= 2
      ? "bg-[#FFB800]/20 border-[#FFB800]/40 text-[#FFB800]"
      : "bg-[#00E5FF]/10 border-[#00E5FF]/20 text-[#00E5FF]";

  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${chipColor}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {label}
    </motion.button>
  );
}

export default TrialCountdown;
