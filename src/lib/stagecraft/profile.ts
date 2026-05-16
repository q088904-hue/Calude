// User profile. Edit this file to repurpose Stagecraft for any user.
// The shipped default is John Viju's profile per the v2 coaching prompt.
// `realNumbers` is the ONLY pool of numeric claims the agent may use in
// sample answers — it must never invent a metric.

import type { Profile } from "./types";

export const profile: Profile = {
  name: "John Viju",
  location: "Mumbai, India",
  currentRole:
    "Creative Head / Creative Director — Datamatics Global Services",
  tenure: "18+ years at Datamatics, 20+ years total",
  targetRoles: [
    "Creative Director",
    "VP Brand",
    "Head of Design",
    "AI Creative Lead",
  ],
  targetMarkets: ["Mumbai", "Dubai", "Singapore"],
  realNumbers: [
    "20+ years experience",
    "18+ years at Datamatics",
    "team of 6 designers",
    "100+ global campaigns per year",
    "video pipeline reduced from 2 days to under 2 minutes (N8N + HeyGen + ElevenLabs)",
    "~40% faster campaign production using GenAI",
    "Leadership Excellence in Execution Award x 8 (2009, 2013, 2016, 2018, 2021, 2022, 2024, 2025)",
    "Architected Datamatics' DAM system",
  ],
  craft: [
    "Branding",
    "Motion graphics",
    "3D",
    "AR/VR",
    "UI/UX",
    "AI-driven design",
  ],
  education: [
    "Diploma in Interactive Multimedia — Digiscape Gallery, Chennai (2001)",
    "Fine Arts — Citra School of Arts, Nagercoil (2000)",
  ],
  starStories: [
    {
      title: "Brand Transformation",
      situation:
        "Datamatics had grown through acquisitions and the brand had drifted across business units.",
      task: "Unify the brand system without slowing down active campaigns.",
      action:
        "I led a cross-unit audit, rebuilt the design system, and rolled it out with review checkpoints.",
      result:
        "All units shipped under one consistent identity within two cycles, with no campaign delay.",
      tags: ["leadership", "strategy"],
    },
    {
      title: "In-House Creative System",
      situation:
        "Outsourcing costs were rising and external work felt off-brand.",
      task: "Reduce agency dependency without losing creative quality.",
      action:
        "I built an in-house creative function, hired specialists, and codified a brief-to-ship workflow.",
      result:
        "We now ship 100+ global campaigns a year in-house, with stronger brand fit and lower cost.",
      tags: ["process", "business impact"],
    },
    {
      title: "High-Pressure Deadlines",
      situation:
        "Three global events landed in the same window with overlapping deliverables.",
      task: "Ship all three at premium quality without burning the team.",
      action:
        "I broke the work into priority layers, defined essential vs. nice-to-have, and ran a fast review loop.",
      result:
        "All three shipped on time with no client escalations.",
      tags: ["pressure handling"],
    },
    {
      title: "Stakeholder Conflict",
      situation:
        "A senior stakeholder wanted busy, dense layouts; the brand needed minimalism.",
      task: "Hold the brand line without burning the relationship.",
      action:
        "I educated, not argued. I showed comparison work, eye-tracking precedents, and the why behind minimalism.",
      result:
        "The stakeholder championed the minimal direction in the next review.",
      tags: ["influence", "maturity"],
    },
    {
      title: "AI + Innovation",
      situation:
        "Video production was a 2-day cycle and a bottleneck for campaign speed.",
      task: "Cut cycle time without dropping quality or brand control.",
      action:
        "I built an N8N pipeline integrating HeyGen and ElevenLabs, with brand checkpoints.",
      result:
        "Cycle time dropped from 2 days to under 2 minutes; ~40% faster campaign production overall.",
      tags: ["innovation", "future-ready"],
    },
  ],
  voiceSamples: [
    "I am a creative and brand leader with 20+ years of experience in branding, motion graphics, visual storytelling, and team leadership. My work focuses on building strong brand systems, improving design quality, and delivering creative at scale.",
    "AI is a force multiplier, not a replacement for creative thinking. I use it for faster ideation, variation, mood exploration, and workflow support. The final direction still needs human judgment, brand sense, and cultural awareness.",
    "I balance direction and trust. Clear objectives, examples, and boundaries — then space to explore. I review for concept strength, consistency, and execution.",
  ],
  weakPatterns: [
    "dropped article",
    "preposition (discuss about, cope up with, revert back)",
    "filler (the same, do the needful, kindly, as such, actually, basically)",
    "tense confusion (past simple vs. present perfect)",
    "continuous-tense overuse (I am having)",
    "weak connectors (and also, means, like that only)",
    "missing plural-s and third-person-s",
    'misplaced "only"',
    "run-on sentences without full stops",
  ],
};
