/**
 * MeenTrack V2 — Shared constants
 *
 * Single source of truth for harbor metadata. Previously the label maps were
 * copy-pasted into HomeDashboard, WeatherAlerts, ActiveTrip and ProfileSettings;
 * any new harbor had to be added in four places. Consolidated here.
 *
 * i18n note: `shortTa` / `shortML` carry the native-script names so harbor
 * labels localize correctly the moment the app-wide i18n pass (Milestone 6 —
 * next-intl) lands. Today the UI is English-only outside SeaStatusBanner, so
 * `harborLabel()` returns English; pass a locale to `harborLabelL10n()` once
 * i18n is wired.
 */

export type Locale = "en" | "ta" | "ml";

export type HarborState = "Kerala" | "Karnataka" | "Tamil Nadu";

export type HarborId =
  // Kerala
  | "kochi"
  | "vizhinjam"
  | "neendakara"
  | "kozhikode"
  | "kasaragod"
  // Karnataka
  | "mangalore"
  // Tamil Nadu
  | "colachel"
  | "muttom"
  | "chinnamuttom"
  | "thoothukudi"
  | "nagapattinam";

interface HarborMeta {
  /** English short display name — "Kochi" */
  short:   string;
  /** Tamil short name — "கொச்சி" */
  shortTa: string;
  /** Malayalam short name — "കൊച്ചി" */
  shortMl: string;
  /** State the harbour belongs to. */
  state:   HarborState;
}

/**
 * Insertion order = display order in the onboarding picker:
 * Kerala → Karnataka → Tamil Nadu.
 */
export const HARBORS: Record<HarborId, HarborMeta> = {
  // ── Kerala ──────────────────────────────────────────────────────────────
  kochi:        { short: "Kochi",        shortTa: "கொச்சி",      shortMl: "കൊച്ചി",       state: "Kerala"     },
  vizhinjam:    { short: "Vizhinjam",    shortTa: "விழிஞ்சம்",   shortMl: "വിഴിഞ്ഞം",     state: "Kerala"     },
  neendakara:   { short: "Neendakara",   shortTa: "நீண்டகரை",    shortMl: "നീണ്ടകര",      state: "Kerala"     },
  kozhikode:    { short: "Kozhikode",    shortTa: "கோழிக்கோடு",  shortMl: "കോഴിക്കോട്",   state: "Kerala"     },
  kasaragod:    { short: "Kasaragod",    shortTa: "காசர்கோடு",   shortMl: "കാസർകോട്",     state: "Kerala"     },
  // ── Karnataka ───────────────────────────────────────────────────────────
  mangalore:    { short: "Mangalore",    shortTa: "மங்களூரு",    shortMl: "മംഗളൂരു",      state: "Karnataka"  },
  // ── Tamil Nadu ──────────────────────────────────────────────────────────
  colachel:     { short: "Colachel",     shortTa: "கொளச்சல்",     shortMl: "കൊളച്ചൽ",      state: "Tamil Nadu" },
  muttom:       { short: "Muttom",       shortTa: "முட்டம்",      shortMl: "മുട്ടം",       state: "Tamil Nadu" },
  chinnamuttom: { short: "Chinnamuttom", shortTa: "சின்னமுட்டம்", shortMl: "ചിന്നമുട്ടം",  state: "Tamil Nadu" },
  thoothukudi:  { short: "Thoothukudi",  shortTa: "தூத்துக்குடி", shortMl: "തൂത്തുക്കുടി", state: "Tamil Nadu" },
  nagapattinam: { short: "Nagapattinam", shortTa: "நாகப்பட்டினம்", shortMl: "നാഗപട്ടണം",   state: "Tamil Nadu" },
};

const DEFAULT: HarborId = "kochi";

function meta(id: string): HarborMeta {
  return HARBORS[id as HarborId] ?? HARBORS[DEFAULT];
}

/** English short label — falls back to "Kochi" for unknown / empty ids. */
export function harborLabel(id: string): string {
  return meta(id).short;
}

/**
 * Locale-aware short label. English today everywhere except SeaStatusBanner;
 * call sites flip to this once the Milestone 6 i18n pass is in.
 */
export function harborLabelL10n(id: string, locale: Locale = "en"): string {
  const m = meta(id);
  return locale === "ta" ? m.shortTa : locale === "ml" ? m.shortMl : m.short;
}

/** Full "City, State" label — falls back to "Kochi, Kerala". */
export function harborFull(id: string): string {
  const m = meta(id);
  return `${m.short}, ${m.state}`;
}

/** Alias of {@link harborLabel} kept for call-site readability. */
export const harborShort = harborLabel;

/**
 * The onboarding harbour picker list, derived from HARBORS so there is exactly
 * one place to add a harbour. `sub` shows the state.
 */
export const HARBOR_OPTIONS: { id: HarborId; label: string; sub: HarborState }[] =
  (Object.keys(HARBORS) as HarborId[]).map((id) => ({
    id,
    label: HARBORS[id].short,
    sub:   HARBORS[id].state,
  }));
