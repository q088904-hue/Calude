"use client";

/**
 * BottomNav — MeenTrack V2
 * 5-tab navigation bar with frosted surface + active aqua indicator.
 * Inspired by Revolut's bottom nav density + GO Club's premium dark treatment.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Home, Map, Fish, CloudSun, User } from "lucide-react";
import { gradients, springs } from "../tokens";
import { useT } from "@/lib/meentrack/i18n";

export type NavTab = "home" | "map" | "catch" | "weather" | "profile";

interface Props {
  active:     NavTab;
  onChange:   (tab: NavTab) => void;
  tripActive?: boolean;
}

const TABS: { id: NavTab; icon: React.ElementType; tKey: string }[] = [
  { id: "home",    icon: Home,     tKey: "nav.home"     },
  { id: "map",     icon: Map,      tKey: "nav.hotspots" },
  { id: "catch",   icon: Fish,     tKey: "nav.trips"    },
  { id: "weather", icon: CloudSun, tKey: "nav.weather"  },
  { id: "profile", icon: User,     tKey: "nav.profile"  },
];

export function BottomNav({ active, onChange, tripActive = false }: Props) {
  const { t } = useT();
  return (
    <nav
      className="flex-shrink-0 flex items-stretch"
      style={{
        background: gradients.navBar,
        borderTop: "1px solid var(--color-mt-border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map(({ id, icon: Icon, tKey }) => {
        const isActive = active === id;
        const label = t(tKey);
        return (
          <motion.button
            key={id}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.84 }}
            transition={springs.snap}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 relative min-h-[60px]"
          >
            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-mt-aqua"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {/* Icon — springs to slightly larger scale when tab is active */}
            <div className="relative">
              <motion.div
                animate={{ scale: isActive ? 1.14 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-mt-aqua" : "text-mt-dim"
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ transition: "color 0.2s, stroke-width 0.2s" }}
                />
              </motion.div>
              {/* Pulsing trip-active indicator on the Trips tab */}
              <AnimatePresence>
                {id === "catch" && tripActive && (
                  <motion.span
                    key="trip-dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={springs.snap}
                    className="absolute -top-0.5 -right-1 flex h-2 w-2"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mt-aqua opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-mt-aqua" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                isActive ? "text-mt-aqua" : "text-mt-dim"
              }`}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
