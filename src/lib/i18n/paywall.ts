// Paywall & subscription copy — EN / TA / ML
// ⚠ i18n-critical strings marked below must be reviewed by a native Tamil / Malayalam speaker
// before production deployment. Do NOT ship machine translations for safety-adjacent copy.
//
// Convention: tier names are intentionally kept in English (Pro/Fleet) in all locales —
// English loan-words are common in South Indian fishing communities for commercial terms.

export type Locale = "en" | "ta" | "ml";

export interface PaywallCopy {
  // Modal headline + subhead
  headline: string;
  subhead: string;

  // Billing interval toggle
  monthly: string;
  yearly: string;
  yearlySavingsBadge: (percent: number) => string;

  // Plan names
  freePlanName: string;
  proPlanName: string;
  fleetPlanName: string;

  // Pricing labels
  freePrice: string;
  proPriceMonthly: (amount: number) => string;
  proPriceYearly: (amount: number, perMonth: number) => string;
  fleetPriceMonthly: (amount: number) => string;
  fleetPriceYearly: (amount: number) => string;
  mostPopular: string;
  currentPlan: string;
  upToNBoats: (n: number) => string;

  // Feature bullets
  freeFeatures: string[];
  proFeatures: string[];
  fleetFeatures: string[];

  // CTAs
  startTrialCta: string;
  noCardNeeded: string;
  choosePlanCta: (plan: string) => string;

  // Trust signals
  trustedBy: string;
  trustedSources: string;
  cancelAnytime: string;
  upiSupported: string;

  // Share-pay
  sharePayment: string;

  // Trial countdown (nav chip)
  trialDaysLeft: (n: number) => string;
  trialEndsToday: string;

  // Notifications
  trialDay6Notification: string;
  trialExpiredCard: string;

  // Locked feature inline card
  lockedCta: string;
  lockedSubhead: (feature: string) => string;

  // Post-subscribe
  proActivatedToast: string;
  paymentFailedBanner: string;
  paymentFailedDaysLeft: (n: number) => string;
}

const copy: Record<Locale, PaywallCopy> = {
  en: {
    headline: "Start fishing smarter.",
    subhead: "Built for South Indian fishermen.",
    monthly: "Monthly",
    yearly: "Yearly",
    yearlySavingsBadge: (p) => `Save ${p}%`,
    freePlanName: "Free",
    proPlanName: "Pro",
    fleetPlanName: "Fleet",
    freePrice: "₹0",
    proPriceMonthly: (a) => `₹${a}/month`,
    proPriceYearly: (a, pm) => `₹${a}/year  (₹${pm}/month)`,
    fleetPriceMonthly: (a) => `₹${a}/month`,
    fleetPriceYearly: (a) => `₹${a}/year`,
    mostPopular: "★ Most popular",
    currentPlan: "Current plan",
    upToNBoats: (n) => `Up to ${n} boats`,
    freeFeatures: [
      "Full safety — SOS, sea status, alerts",
      "Basic map + all 10 harbors",
      "3 AI questions per day",
      "5-band BiteTime today",
      "5 saved waypoints",
    ],
    proFeatures: [
      "Find fish with AI — unlimited*",
      "BiteTime™ forecast — next 48 hours",
      "PFZ heatmap + bathymetry layers",
      "Identify any fish from photo",
      "Full route planner with ETA",
      "Catch history insights + PDF export",
    ],
    fleetFeatures: [
      "Everything in Pro",
      "Track all your boats on one screen",
      "Crew catch reports",
      "Fleet analytics + export",
      "Priority data refresh",
    ],
    startTrialCta: "Start 7-day free trial",
    noCardNeeded: "No card needed",
    choosePlanCta: (plan) => `Choose ${plan}`,
    trustedBy: "Trusted data from:",
    trustedSources: "INCOIS · IMD · NASA · Coast Guard 1554",
    cancelAnytime: "Cancel anytime",
    upiSupported: "UPI AutoPay supported",
    sharePayment: "Share payment with family",
    trialDaysLeft: (n) => `Trial: ${n} day${n === 1 ? "" : "s"} left`,
    trialEndsToday: "Trial ends today",
    trialDay6Notification:
      "1 day left in your free trial. Subscribe to keep Pro features.",
    trialExpiredCard:
      "Your free trial ended. Continue on Free or upgrade to Pro.",
    lockedCta: "Start 7-day free trial →",
    lockedSubhead: (f) => `Unlock ${f} with Pro.`,
    proActivatedToast: "Pro activated. Happy fishing! 🎣",
    paymentFailedBanner: "Payment failed. Update payment to keep Pro.",
    paymentFailedDaysLeft: (n) =>
      `Pro access ends in ${n} day${n === 1 ? "" : "s"} if not updated.`,
  },

  // ⚠ i18n-critical — MUST be reviewed by a native Tamil speaker before production
  ta: {
    headline: "மீன்பிடியை புத்திசாலித்தனமாக்கு.",
    subhead: "தென் இந்திய மீனவர்களுக்காக.",
    monthly: "மாதம்",
    yearly: "ஆண்டு",
    yearlySavingsBadge: (p) => `${p}% சேமிக்கவும்`,
    freePlanName: "இலவசம்",
    proPlanName: "Pro",
    fleetPlanName: "Fleet",
    freePrice: "₹0",
    proPriceMonthly: (a) => `₹${a}/மாதம்`,
    proPriceYearly: (a, pm) => `₹${a}/ஆண்டு  (₹${pm}/மாதம்)`,
    fleetPriceMonthly: (a) => `₹${a}/மாதம்`,
    fleetPriceYearly: (a) => `₹${a}/ஆண்டு`,
    mostPopular: "★ மிகவும் பிரபலம்",
    currentPlan: "தற்போதைய திட்டம்",
    upToNBoats: (n) => `${n} படகுகள் வரை`,
    freeFeatures: [
      "முழு பாதுகாப்பு — SOS, கடல் நிலை, எச்சரிக்கைகள்",
      "அடிப்படை வரைபடம் + 10 துறைமுகங்கள்",
      "நாளுக்கு 3 AI கேள்விகள்",
      "இன்றைய BiteTime நிலை",
      "5 இட முள்ளிகள்",
    ],
    proFeatures: [
      "AI மூலம் மீன் தேடு — வரம்பற்றது*",
      "BiteTime™ முன்னறிவிப்பு — 48 மணி நேரம்",
      "PFZ வெப்பவரைபடம் + கடல் ஆழ அடுக்குகள்",
      "படத்திலிருந்து மீன் கண்டறிதல்",
      "பாதை திட்டமிடல் + வருகை நேரம்",
      "வேட்டை வரலாறு + PDF ஏற்றுமதி",
    ],
    fleetFeatures: [
      "Pro-ல் உள்ள அனைத்தும்",
      "உங்கள் அனைத்து படகுகளையும் ஒரே திரையில் கண்காணி",
      "குழு வேட்டை அறிக்கைகள்",
      "குழு பகுப்பாய்வு + ஏற்றுமதி",
      "முன்னுரிமை தரவு புதுப்பிப்பு",
    ],
    startTrialCta: "7 நாள் இலவச சோதனை தொடங்கு",
    noCardNeeded: "கார்டு தேவையில்லை",
    choosePlanCta: (plan) => `${plan} தேர்வு செய்`,
    trustedBy: "நம்பகமான தரவு:",
    trustedSources: "INCOIS · IMD · NASA · கடலோர காவல்படை 1554",
    cancelAnytime: "எப்போதும் ரத்து செய்யலாம்",
    upiSupported: "UPI AutoPay ஆதரவு",
    sharePayment: "குடும்பத்துடன் கட்டணம் பகிரு",
    trialDaysLeft: (n) => `சோதனை: ${n} நாள் மீதம்`,
    trialEndsToday: "இன்று சோதனை முடிகிறது",
    trialDay6Notification:
      "உங்கள் இலவச சோதனையில் 1 நாள் மட்டுமே மீதம். Pro தொடர சந்தா ஆகவும்.",
    trialExpiredCard:
      "இலவச சோதனை முடிந்தது. இலவசத்தில் தொடரவும் அல்லது Pro-க்கு மேம்படுத்தவும்.",
    lockedCta: "7 நாள் இலவச சோதனை தொடங்கு →",
    lockedSubhead: (f) => `Pro மூலம் ${f} திறக்கவும்.`,
    proActivatedToast: "Pro செயல்படுத்தப்பட்டது. நல்ல மீன்பிடி!",
    paymentFailedBanner: "கட்டணம் தோல்வியடைந்தது. Pro வைத்திருக்க புதுப்பிக்கவும்.",
    paymentFailedDaysLeft: (n) =>
      `புதுப்பிக்கவில்லை என்றால் ${n} நாளில் Pro அணுகல் முடிகிறது.`,
  },

  // ⚠ i18n-critical — MUST be reviewed by a native Malayalam speaker before production
  ml: {
    headline: "മീൻപിടിത്തം മിടുക്കനാക്കൂ.",
    subhead: "തെക്കൻ ഇന്ത്യൻ മത്സ്യത്തൊഴിലാളികൾക്കായി.",
    monthly: "മാസം",
    yearly: "വർഷം",
    yearlySavingsBadge: (p) => `${p}% ലാഭിക്കൂ`,
    freePlanName: "സൗജന്യം",
    proPlanName: "Pro",
    fleetPlanName: "Fleet",
    freePrice: "₹0",
    proPriceMonthly: (a) => `₹${a}/മാസം`,
    proPriceYearly: (a, pm) => `₹${a}/വർഷം  (₹${pm}/മാസം)`,
    fleetPriceMonthly: (a) => `₹${a}/മാസം`,
    fleetPriceYearly: (a) => `₹${a}/വർഷം`,
    mostPopular: "★ ഏറ്റവും ജനപ്രിയം",
    currentPlan: "നിലവിലെ പ്ലാൻ",
    upToNBoats: (n) => `${n} ബോട്ടുകൾ വരെ`,
    freeFeatures: [
      "പൂർണ്ണ സുരക്ഷ — SOS, കടൽ സ്ഥിതി, മുന്നറിയിപ്പുകൾ",
      "അടിസ്ഥാന മാപ്പ് + 10 തുറമുഖങ്ങൾ",
      "ദിവസം 3 AI ചോദ്യങ്ങൾ",
      "ഇന്നത്തെ BiteTime സ്ഥിതി",
      "5 വേയ്‌പോയിന്റുകൾ",
    ],
    proFeatures: [
      "AI ഉപയോഗിച്ച് മത്സ്യം കണ്ടെത്തുക — പരിധിയില്ലാതെ*",
      "BiteTime™ പ്രവചനം — 48 മണിക്കൂർ",
      "PFZ ഹീറ്റ്‌മാപ്പ് + ബാഥിമെട്രി ലെയറുകൾ",
      "ഫോട്ടോയിൽ നിന്ന് മത്സ്യം തിരിച്ചറിയൽ",
      "ETA സഹിതം റൂട്ട് പ്ലാനർ",
      "ക്യാച്ച് ഹിസ്‌റ്ററി + PDF എക്‌സ്‌പോർട്ട്",
    ],
    fleetFeatures: [
      "Pro-ലെ എല്ലാം",
      "എല്ലാ ബോട്ടുകളും ഒരേ സ്‌ക്രീനിൽ ട്രാക്ക് ചെയ്യൂ",
      "ക്രൂ ക്യാച്ച് റിപ്പോർട്ടുകൾ",
      "ഫ്ലീറ്റ് അനലിറ്റിക്‌സ് + എക്‌സ്‌പോർട്ട്",
      "മുൻഗണനാ ഡാറ്റ റിഫ്രഷ്",
    ],
    startTrialCta: "7 ദിവസ സൗജന്യ ട്രയൽ തുടങ്ങുക",
    noCardNeeded: "കാർഡ് ആവശ്യമില്ല",
    choosePlanCta: (plan) => `${plan} തിരഞ്ഞെടുക്കൂ`,
    trustedBy: "വിശ്വസനീയ ഡാറ്റ:",
    trustedSources: "INCOIS · IMD · NASA · തീരദേശ സേന 1554",
    cancelAnytime: "എപ്പോൾ വേണമെങ്കിലും റദ്ദാക്കാം",
    upiSupported: "UPI AutoPay പിന്തുണ",
    sharePayment: "കുടുംബവുമായി പേയ്‌മെന്റ് പങ്കിടുക",
    trialDaysLeft: (n) => `ട്രയൽ: ${n} ദിവസം ബാക്കി`,
    trialEndsToday: "ട്രയൽ ഇന്ന് അവസാനിക്കും",
    trialDay6Notification:
      "നിങ്ങളുടെ സൗജന്യ ട്രയൽ 1 ദിവസം ബാക്കി. Pro തുടരാൻ സബ്‌സ്‌ക്രൈബ് ചെയ്യൂ.",
    trialExpiredCard:
      "സൗജന്യ ട്രയൽ അവസാനിച്ചു. സൗജന്യം തുടരുക അല്ലെങ്കിൽ Pro-ലേക്ക് അപ്‌ഗ്രേഡ് ചെയ്യൂ.",
    lockedCta: "7 ദിവസ സൗജന്യ ട്രയൽ തുടങ്ങുക →",
    lockedSubhead: (f) => `Pro ഉപയോഗിച്ച് ${f} അൺലോക്ക് ചെയ്യൂ.`,
    proActivatedToast: "Pro സജീവമായി. സുഖകരമായ മത്സ്യബന്ധനം!",
    paymentFailedBanner: "പേയ്‌മെന്റ് പരാജയപ്പെട്ടു. Pro നിലനിർത്താൻ അപ്‌ഡേറ്റ് ചെയ്യൂ.",
    paymentFailedDaysLeft: (n) =>
      `അപ്‌ഡേറ്റ് ചെയ്‌തില്ലെങ്കിൽ ${n} ദിവസത്തിൽ Pro ആക്‌സസ് അവസാനിക്കും.`,
  },
};

export function getPaywallCopy(locale: Locale = "en"): PaywallCopy {
  return copy[locale] ?? copy.en;
}

// Feature display names for the locked-feature card
export const FEATURE_DISPLAY_NAMES: Record<string, Record<Locale, string>> = {
  pfz_layer: {
    en: "PFZ Heatmap",
    ta: "PFZ வெப்பவரைபடம்",
    ml: "PFZ ഹീറ്റ്‌മാപ്പ്",
  },
  bathymetry_layer: {
    en: "Depth Map",
    ta: "ஆழ வரைபடம்",
    ml: "ആഴ മാപ്പ്",
  },
  advisor_query: {
    en: "AI Hotspot Finder",
    ta: "AI மீன் இட தேடல்",
    ml: "AI ഹോട്ട്‌സ്‌പോട്ട് ഫൈൻഡർ",
  },
  species_id: {
    en: "Fish Identifier",
    ta: "மீன் கண்டறிதல்",
    ml: "മത്സ്യ തിരിച്ചറിയൽ",
  },
  bitetime_today_full: {
    en: "BiteTime™ Score",
    ta: "BiteTime™ மதிப்பெண்",
    ml: "BiteTime™ സ്‌കോർ",
  },
  bitetime_forecast: {
    en: "BiteTime™ Forecast",
    ta: "BiteTime™ முன்னறிவிப்பு",
    ml: "BiteTime™ പ്രവചനം",
  },
  route_planner: {
    en: "Route Planner",
    ta: "பாதை திட்டமிடல்",
    ml: "റൂട്ട് പ്ലാനർ",
  },
  catch_analytics: {
    en: "Catch Insights",
    ta: "வேட்டை பகுப்பாய்வு",
    ml: "ക്യാച്ച് ഇൻ‌സൈറ്റ്‌സ്",
  },
};
