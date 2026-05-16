import { AnalysisResult } from "./types";

export const mockAnalysisResult: AnalysisResult = {
  overallScore: 82,
  verdict: "Strong",
  verdictSummary:
    "This design demonstrates a clear understanding of visual hierarchy and brand expression. The composition is well-structured with purposeful use of negative space. Strategic refinements in typography scale and color contrast would elevate this from strong to exceptional.",
  scores: [
    { category: "Concept", score: 85, maxScore: 100 },
    { category: "Hierarchy", score: 78, maxScore: 100 },
    { category: "Brand Fit", score: 88, maxScore: 100 },
    { category: "Typography", score: 75, maxScore: 100 },
    { category: "Color", score: 82, maxScore: 100 },
    { category: "Composition", score: 80, maxScore: 100 },
    { category: "Clarity", score: 90, maxScore: 100 },
    { category: "Memorability", score: 72, maxScore: 100 },
    { category: "Strategic Value", score: 84, maxScore: 100 },
    { category: "Execution", score: 86, maxScore: 100 },
  ],
  insights: [
    {
      id: "intent",
      title: "Intent & Audience",
      icon: "target",
      content:
        "The design communicates a clear enterprise-facing intent, targeting C-suite decision-makers and technology leaders. The visual language signals authority and expertise. However, the audience segmentation could be sharper — consider whether the primary viewer is a CTO evaluating capability or a CMO evaluating brand alignment. The current tone splits between both, which dilutes impact. Recommendation: Commit to one primary audience persona and layer secondary messaging beneath.",
      type: "analysis",
    },
    {
      id: "concept",
      title: "Concept & Metaphor",
      icon: "lightbulb",
      content:
        "The underlying concept leverages a technology-meets-precision metaphor that aligns with Datamatics' positioning. The visual narrative suggests transformation through intelligence. The metaphorical depth could be strengthened — currently it reads as 'modern tech company' rather than 'intelligent systems partner'. Consider embedding a visual metaphor that speaks to insight discovery or data illumination rather than generic digital abstraction.",
      type: "analysis",
    },
    {
      id: "hierarchy",
      title: "Visual Hierarchy",
      icon: "layers",
      content:
        "Strong primary hierarchy with clear entry points. The headline captures attention effectively, and the CTA placement follows natural scan patterns. Secondary information is well-organized. Areas for improvement: The middle section creates a visual plateau — every element carries similar weight, causing the eye to disengage. Introduce a clear secondary focal point with dimensional contrast (scale, color, or spacing) to maintain engagement through the full scroll.",
      type: "analysis",
    },
    {
      id: "eyeflow",
      title: "Eye Flow",
      icon: "scan-eye",
      content:
        "Eye flow follows a modified Z-pattern, appropriate for this layout type. Entry point (top-left headline) → visual anchor (hero image) → supporting text → CTA. The flow breaks slightly in the mid-section where competing elements create visual friction. The exit point lacks a compelling retention mechanism. Consider adding a subtle visual breadcrumb system or progressive disclosure pattern to guide the eye more intentionally through the entire experience.",
      type: "analysis",
    },
    {
      id: "color",
      title: "Color & Lighting",
      icon: "palette",
      content:
        "The color palette demonstrates good restraint and brand alignment. Primary blacks and whites create a premium foundation, with the red accent used strategically for CTAs and emphasis. The color ratio follows approximately 70/20/10 — which is correct. Suggestion: The grey midtones could benefit from slightly warmer undertones to prevent the palette from feeling clinical. Consider introducing a subtle warm grey (#F8F7F5) for background surfaces to add sophistication.",
      type: "analysis",
    },
    {
      id: "typography",
      title: "Typography",
      icon: "type",
      content:
        "Typography selection is appropriate with a geometric sans-serif that communicates modernity. The type scale needs refinement — there are currently 7 distinct sizes visible, which should be consolidated to a maximum of 5 for clarity. Line height on body text (currently ~1.4) should increase to 1.6 for optimal readability. Letter-spacing on headlines could be tightened by -0.02em to increase premium feel. The typographic hierarchy would benefit from weight contrast rather than size contrast alone.",
      type: "analysis",
    },
    {
      id: "semiotics",
      title: "Semiotics & Psychology",
      icon: "brain",
      content:
        "The semiotic system communicates: reliability, modernity, and technological competence. The psychological impact leans toward trust and authority — appropriate for enterprise positioning. The angular geometry suggests precision and decisiveness. Missing: warmth signals that would balance the technical efficiency with human approachability. Enterprise buyers increasingly respond to 'intelligent + empathetic' brands. Consider softening one geometric element to introduce this dimension without compromising the core authority message.",
      type: "analysis",
    },
    {
      id: "brandfit",
      title: "Brand Fit",
      icon: "shield-check",
      content:
        "Strong alignment with Datamatics brand values: intelligence, precision, and enterprise-grade quality. The visual execution reflects the brand's positioning as a forward-thinking technology partner. Brand score: 88/100. The design successfully avoids startup-casual aesthetics and maintains professional gravitas. To reach 95+: Ensure the red accent is used exclusively for primary actions and critical emphasis — currently it appears in 4 locations, which should be reduced to 2-3 for maximum impact and brand consistency.",
      type: "analysis",
    },
    {
      id: "strengths",
      title: "Strengths",
      icon: "check-circle",
      content:
        "• Clean, uncluttered composition that respects the viewer's attention\n• Strong brand color discipline with purposeful accent usage\n• Typography hierarchy that guides reading priority effectively\n• Professional photography/imagery selection that reinforces credibility\n• Responsive consideration evident in layout structure\n• Clear call-to-action placement with appropriate visual weight\n• Effective use of whitespace as a design element, not just empty space",
      type: "strength",
    },
    {
      id: "improvements",
      title: "Areas for Improvement",
      icon: "alert-triangle",
      content:
        "• Mid-section visual plateau needs dimensional contrast to maintain engagement\n• Typography scale should be simplified from 7 to 5 distinct sizes\n• Body text line-height needs increase from 1.4 to 1.6\n• Secondary content sections lack clear visual differentiation\n• Mobile breakpoint considerations need attention for the hero section\n• Loading state and micro-interaction design should be defined\n• Footer section feels disconnected from the main narrative flow",
      type: "improvement",
    },
    {
      id: "missed",
      title: "Missed Opportunities",
      icon: "zap",
      content:
        "• No motion design language defined — premium brands use purposeful animation to communicate personality\n• Data visualization opportunity in the capabilities section (show, don't just tell)\n• Social proof section underutilizes the power of client logos and case study previews\n• No progressive disclosure pattern — everything is revealed at once, reducing engagement\n• Interactive elements could demonstrate the product's intelligence\n• Dark mode variant would expand brand expression range",
      type: "opportunity",
    },
    {
      id: "strategic",
      title: "Strategic Feedback",
      icon: "compass",
      content:
        "This design positions Datamatics as a competent, modern technology company. To position as a category leader, the design needs to signal innovation rather than just competence. Strategic recommendation: Introduce one 'signature moment' — a single unexpected design element that is uniquely Datamatics. This could be a custom illustration style, a unique interaction pattern, or a distinctive content framing device. Category leaders are remembered for what's different, not what's well-executed.",
      type: "analysis",
    },
    {
      id: "upgrades",
      title: "Upgrade Recommendations",
      icon: "arrow-up-circle",
      content:
        "1. Implement a modular type scale: 14 / 16 / 20 / 28 / 40px with consistent line-height ratios\n2. Add a secondary accent color (warm grey or muted gold) for informational highlights\n3. Design a micro-animation system for scroll-triggered reveals\n4. Create a custom icon set that reflects Datamatics' visual language\n5. Implement a grid overlay with 12-column structure and 24px gutters\n6. Add depth through subtle shadows (0 1px 3px rgba(0,0,0,0.08)) on elevated surfaces\n7. Consider a sticky navigation pattern for long-form content sections",
      type: "improvement",
    },
    {
      id: "positioning",
      title: "Positioning Analysis",
      icon: "crosshair",
      content:
        "Current positioning: 'Professional and capable enterprise technology partner'\nTarget positioning: 'The most intelligent enterprise technology partner'\nGap analysis: The design communicates reliability over innovation. To close this gap, the visual system needs elements that demonstrate intelligence — real-time data, adaptive layouts, or content that responds to context. The positioning should make competitors look generic by comparison. Consider how Apple's website makes you feel the product's quality before you read a single word — aim for this level of embodied brand communication.",
      type: "analysis",
    },
    {
      id: "finalverdict",
      title: "Final Verdict",
      icon: "award",
      content:
        "This is a strong, professional design that correctly represents Datamatics' brand values and enterprise positioning. It succeeds at the fundamentals: clean composition, clear hierarchy, brand-aligned color usage, and professional typography. To elevate from 'strong professional work' to 'award-winning brand experience,' focus on: (1) creating one signature design moment, (2) refining the typographic system for precision, and (3) introducing purposeful motion design. The foundation is excellent — these refinements would push it into the top tier of enterprise design.",
      type: "analysis",
    },
  ],
};
