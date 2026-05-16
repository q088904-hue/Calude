"use client";

/**
 * MeenTrack V2 — lightweight i18n
 *
 * Why not next-intl: this app is a single client route (/meentrack/v2) with
 * internal tab state and locale stored as *profile preference* — not a URL
 * segment. next-intl's path-routed locale model fights that architecture.
 * A typed React context driven by the existing `demoLocale`/profile state is
 * the correct, zero-dependency fit.
 *
 * Translation status:
 *   • `en` — complete, source of truth.
 *   • `ta` / `ml` — short UI vocabulary (nav, titles) is seeded with standard
 *     terms. Longer / safety-critical copy is intentionally NOT machine-
 *     translated; missing keys fall back to English via the lookup chain, so
 *     the app never shows a blank or a wrong safety string. Production needs a
 *     native-speaker review pass before ta/ml are marked "complete".
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type Locale = "en" | "ta" | "ml";

type Catalog = Record<string, string>;

// ── Message catalogs ──────────────────────────────────────────────────────────

const en: Catalog = {
  "nav.home":       "Home",
  "nav.hotspots":   "Hotspots",
  "nav.trips":      "Trips",
  "nav.weather":    "Weather",
  "nav.profile":    "Profile",

  "screen.tripLog":        "Trip Log",
  "screen.weatherAlerts":  "Weather & Alerts",
  "screen.hotspotFinder":  "Hotspot Finder",
  "screen.profile":        "Profile",
  "screen.home":           "Home",
  "screen.activeTrip":     "Active Trip",

  "home.greeting.morning":   "Good morning",
  "home.greeting.afternoon": "Good afternoon",
  "home.greeting.evening":   "Good evening",
  "home.captain":            "Captain",
};

// Tamil — standard UI vocabulary. Reviewed terms only; the rest inherits `en`.
const ta: Catalog = {
  "nav.home":       "முகப்பு",
  "nav.hotspots":   "மண்டலம்",
  "nav.trips":      "பயணம்",
  "nav.weather":    "வானிலை",
  "nav.profile":    "சுயவிவரம்",

  "screen.tripLog":        "பயணப் பதிவு",
  "screen.weatherAlerts":  "வானிலை & எச்சரிக்கைகள்",
  "screen.hotspotFinder":  "மீன் மண்டலம்",
  "screen.profile":        "சுயவிவரம்",
  "screen.home":           "முகப்பு",
  "screen.activeTrip":     "நடப்புப் பயணம்",

  "home.greeting.morning":   "காலை வணக்கம்",
  "home.greeting.afternoon": "மதிய வணக்கம்",
  "home.greeting.evening":   "மாலை வணக்கம்",
  "home.captain":            "கேப்டன்",
};

// Malayalam — standard UI vocabulary. Reviewed terms only; the rest inherits `en`.
const ml: Catalog = {
  "nav.home":       "ഹോം",
  "nav.hotspots":   "സോൺ",
  "nav.trips":      "യാത്ര",
  "nav.weather":    "കാലാവസ്ഥ",
  "nav.profile":    "പ്രൊഫൈൽ",

  "screen.tripLog":        "യാത്രാ ലോഗ്",
  "screen.weatherAlerts":  "കാലാവസ്ഥയും മുന്നറിയിപ്പുകളും",
  "screen.hotspotFinder":  "മത്സ്യ സോൺ",
  "screen.profile":        "പ്രൊഫൈൽ",
  "screen.home":           "ഹോം",
  "screen.activeTrip":     "സജീവ യാത്ര",

  // Malayalam has no natural literal "good afternoon/evening"; the standard
  // respectful greeting നമസ്കാരം is used for both rather than an awkward calque.
  "home.greeting.morning":   "സുപ്രഭാതം",
  "home.greeting.afternoon": "നമസ്കാരം",
  "home.greeting.evening":   "നമസ്കാരം",
  "home.captain":            "ക്യാപ്റ്റൻ",
};

const CATALOGS: Record<Locale, Catalog> = { en, ta, ml };

/**
 * Pure lookup — chain: locale → en → the key itself (never blank).
 * Use this when you need a translation OUTSIDE the React context (e.g. an
 * aria-label computed in a component that renders the provider). Inside the
 * tree, prefer `useT()`.
 */
export function translate(locale: Locale, key: string): string {
  return (CATALOGS[locale] ?? en)[key] ?? en[key] ?? key;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface I18nValue {
  locale: Locale;
  /** Translate a key. Chain: locale → en → the key itself (never blank). */
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue>({
  locale: "en",
  t: (k) => translate("en", k),
});

export function MeenTrackI18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: (key: string) => translate(locale, key) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Returns `{ t, locale }`. `t("nav.home")` → localized string. */
export function useT(): I18nValue {
  return useContext(I18nContext);
}
