// Company prep packs for Stagecraft.
// Each pack injects brand context + watchouts into the coaching system prompt
// so sample answers are calibrated to what that specific company values.

export interface CompanyPack {
  id: string;
  /** Full role + company label, used as the session targetRole */
  label: string;
  /** Short name shown in UI selectors */
  shortName: string;
  /** ~150-word brand brief injected verbatim into the coaching system prompt */
  brandBrief: string;
  /** Typical interview structure — shown as context in UI */
  rounds: string;
  /** Things to emphasise or avoid — surfaced in coaching tone */
  watchOuts: string[];
}

export const COMPANY_PACKS: CompanyPack[] = [
  {
    id: "kohler-india",
    label: "Creative Director — Kohler India",
    shortName: "Kohler India",
    brandBrief: `
TARGET COMPANY — KOHLER INDIA:
Kohler Co. is a 150-year-old American premium brand (founded 1873) spanning plumbing,
power, and interiors. Their brand positioning is sophisticated, restrained luxury —
"gracious living," precision craftsmanship, and design that earns its place. In India,
Kohler is aggressively expanding the premium segment; the Creative Director role sits
at the intersection of global brand standards and Indian market insight.

What Kohler values in creative leadership:
- Brand restraint: elegance over noise; every element must earn its place
- Craft depth: they will test taste, not just output volume
- Premium-bar thinking: work must hold up next to a global Kohler campaign
- B2B-to-premium-consumer pivot: the candidate's Datamatics background will be
  challenged — they must articulate how their enterprise brand discipline translates
  to design-led consumer storytelling
- AI fluency is a differentiator, not a red flag, at Kohler India in 2026

Adjust all sample answers to reflect Kohler's vocabulary: restraint, craft,
premium, material honesty, design leadership, brand integrity.
`.trim(),
    rounds: "HR screener → Hiring Manager → Portfolio / CD → CMO / CXO",
    watchOuts: [
      "B2B → premium consumer pivot will be challenged directly",
      "Kohler values taste and restraint — avoid buzzwords and superlatives",
      "Expect deep portfolio critique calibrated to a global premium bar",
      "18-year tenure question is near-certain at HM and stress rounds",
    ],
  },

  {
    id: "hettich-india",
    label: "Creative Director — Hettich India",
    shortName: "Hettich India",
    brandBrief: `
TARGET COMPANY — HETTICH INDIA:
Hettich is a 130-year-old German precision hardware brand (hinges, drawer systems,
sliding hardware). Their brand identity is rooted in engineered precision, understated
German modernism, and functional beauty. In India they have strong architectural and
interior design distribution; their creative needs blend technical credibility with
aspirational lifestyle messaging.

What Hettich values in creative leadership:
- Technical-meets-beautiful: work must bridge engineers and interior designers
- European brand discipline: clean, systematic, not decorative for its own sake
- B2B-to-specification marketing: the audience is architects, designers, builders
- Craft photography and lifestyle imagery at a quality bar matching European standards
- Brand system thinking over campaign-by-campaign creativity

Adjust all sample answers to reflect Hettich's vocabulary: precision, craftsmanship,
functional elegance, specification, architectural, systematic design.
`.trim(),
    rounds: "HR screener → Marketing Head → Creative/Brand Director → CEO",
    watchOuts: [
      "German brand culture values precision and understatement — avoid hype",
      "B2B/specification marketing experience will be scrutinised",
      "Expect questions about architectural and trade marketing strategy",
      "Portfolio must show system-level thinking, not just campaign aesthetics",
    ],
  },

  {
    id: "marriott-dubai",
    label: "Creative Director — Marriott Intl (Dubai)",
    shortName: "Marriott Dubai",
    brandBrief: `
TARGET COMPANY — MARRIOTT INTERNATIONAL, DUBAI:
Marriott International is the world's largest hotel company, with 30+ brands from
budget to ultra-luxury (Ritz-Carlton, W Hotels, JW Marriott). The Creative Director
role in Dubai oversees brand experience across a multi-property cluster in a market
where guests are global, affluent, and brand-literate. The creative bar is set by
competing against Four Seasons, Aman, and Jumeirah.

What Marriott values in creative leadership:
- Multi-brand stewardship: the ability to serve distinct brand voices simultaneously
- Luxury brand fluency: hospitality is experience-first — photography, video, copy
  must evoke sensation, not just describe a room
- Global-local balance: campaigns must resonate with European, American, GCC, and
  South Asian guests simultaneously
- Speed at scale: flagship hotels need content at high volume across digital, OOH,
  in-hotel, and event channels
- F&B and events creative: this is where hospitality brands distinguish themselves

Adjust all sample answers to reflect hospitality brand vocabulary: experience,
sensory, guest journey, brand voice, luxury, curated, lifestyle positioning.
`.trim(),
    rounds: "HR screener → Area Marketing Director → Regional CD → VP Brand",
    watchOuts: [
      "No direct hospitality experience — must bridge from Datamatics brand work",
      "Luxury brand vocabulary and taste will be tested hard in portfolio round",
      "Multi-brand management complexity needs a specific answer",
      "Dubai market experience or appetite must come through clearly",
    ],
  },

  {
    id: "emaar-dubai",
    label: "Creative Director — Emaar Properties (Dubai)",
    shortName: "Emaar Dubai",
    brandBrief: `
TARGET COMPANY — EMAAR PROPERTIES, DUBAI:
Emaar is the developer behind Downtown Dubai, Burj Khalifa, Dubai Mall, and Address
Hotels — one of the world's most visible real estate and lifestyle brands. Their
creative output spans property launches, retail, hospitality, events, and the Emaar
lifestyle brand itself. Budget and scale are large; the creative bar is set globally.

What Emaar values in creative leadership:
- Iconic-scale thinking: campaigns must match the ambition of a Burj Khalifa launch
- Real estate storytelling: translating architecture and lifestyle into desire
- Arabic-English bilingual brand sensibility: GCC market sensitivity is mandatory
- Integrated campaign leadership: TV, OOH, digital, events, and on-site experience
  all under one creative vision
- Speed and volume at premium quality: Emaar moves fast at scale

Adjust all sample answers to reflect Emaar vocabulary: iconic, landmark,
aspirational, lifestyle, scale, integrated experience, real estate narrative.
`.trim(),
    rounds: "HR screener → Hiring Manager → Creative Leadership panel → CMO",
    watchOuts: [
      "No real estate category experience — must build the analogy bridge clearly",
      "Arabic/GCC cultural sensitivity will be probed",
      "Scale of ambition must match — small-brand examples will not land",
      "Dubai residency or relocation readiness must be stated confidently",
    ],
  },
  {
    id: "marina-bay-sands",
    label: "Creative Director — Marina Bay Sands (Singapore)",
    shortName: "Marina Bay Sands",
    brandBrief: `
TARGET COMPANY — MARINA BAY SANDS, SINGAPORE:
Marina Bay Sands (MBS) is one of the world's most recognised integrated resorts,
operated by Las Vegas Sands. It defines Singapore's skyline and houses a 2,500-room
hotel, the iconic SkyPark, world-class F&B (Adria, Waku Ghin, Ce La Vi), luxury retail
(The Shoppes), MICE facilities, and the ArtScience Museum. Its creative function serves
multiple brand expressions simultaneously at a globally benchmarked luxury tier.

What MBS values in creative leadership:
- Iconic-brand restraint: MBS competes with the world's best hotels — quality over volume
- Multi-vertical creative fluency: hotel, F&B, retail, events, and MICE each need their
  own brand voice within one cohesive visual system
- Pan-Asian market sensitivity: the audience is HNW travellers from China, India, SEA,
  Japan, and the West — culturally fluent creative is a baseline requirement
- Digital-first luxury storytelling: Instagram, WeChat, and experiential are primary
- Speed and governance: large campaign budgets with multiple stakeholders and approvals

Adjust all sample answers to reflect MBS vocabulary: iconic, world-class, curated
experience, integrated resort, luxury, artistry, experiential, brand consistency.
`.trim(),
    rounds: "HR screener → Marketing Director → VP Brand & Creative → COO/CCO",
    watchOuts: [
      "No hospitality sector experience — must demonstrate luxury brand vocabulary credibly",
      "Pan-Asian cultural sensitivity will be probed — name at least one specific insight",
      "Singapore EP / work authorisation readiness must be addressed confidently",
      "Scale of operation dwarfs B2B context — show you can think at flagship scale",
    ],
  },

  {
    id: "pidilite-india",
    label: "Creative Director — Pidilite Industries (Mumbai)",
    shortName: "Pidilite India",
    brandBrief: `
TARGET COMPANY — PIDILITE INDUSTRIES, MUMBAI:
Pidilite is India's largest adhesives and sealants company, with Fevicol as a
cultural icon and a portfolio spanning 50+ brands (Fevikwik, Dr Fixit, M-Seal,
Araldite). Their marketing is legendary in Indian advertising for wit, warmth, and
emotional storytelling at scale. The Creative Director role sits at the intersection
of iconic brand guardianship and modern marketing transformation.

What Pidilite values in creative leadership:
- Brand legacy stewardship: Fevicol is 65+ years old; deep respect for what built it
- Emotional storytelling: Pidilite's hallmark is human, warm, relatable advertising
- Rural-urban brand coherence: campaigns must work in Tier 1 and Tier 4 India
- Trade marketing depth: the channel is hardware stores and contractors — B2B2C
- Transformation appetite: Pidilite is investing in digital and performance marketing
  alongside traditional; they need a leader who can bridge both

Adjust all sample answers to reflect Pidilite vocabulary: iconic, purpose-led,
emotional connect, mass market, brand legacy, transformation, trade, Bharat.
`.trim(),
    rounds: "HR screener → Marketing VP → CMO → MD/CEO panel",
    watchOuts: [
      "Pidilite is deeply Hindi-belt and rural-India rooted — show cultural empathy",
      "Their creative heritage is famous — do not casually critique Fevicol advertising",
      "B2B enterprise background needs translation to mass-market FMCG thinking",
      "Trade and distribution marketing experience will be probed — be specific",
    ],
  },
];

/** Returns null for the "custom" option — caller falls back to raw text field */
export function getPackById(id: string): CompanyPack | null {
  return COMPANY_PACKS.find((p) => p.id === id) ?? null;
}
