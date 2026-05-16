// Parses the 5-block coaching feedback string into typed sections.
// Returns null if the feedback is incomplete (still streaming, or unexpected format).
//
// Also exports parseFeedbackSectionsStreaming — a partial parser that returns
// whatever sections are available mid-stream, enabling progressive section display.

export interface FeedbackSections {
  grammarFix: string;    // full text after "**Grammar fix:**"
  sampleAnswer: string;  // full text after "**Sample answer (memorize this):**"
  deliveryTip: string;   // full text after "**Delivery tip:**"
  scoreLines: string;    // full text after "**Score:**" (META stripped)
  // Pattern tags extracted from [brackets] in the grammar fix block
  patternTags: string[];
}

const META_RE = /\[META\][\s\S]*?\[\/META\]/;

const H_GRAMMAR  = /\*\*\s*Grammar\s+fix\s*:\s*\*\*/i;
const H_SAMPLE   = /\*\*\s*Sample\s+answer[^*]*\*\*/i;
const H_DELIVERY = /\*\*\s*Delivery\s+tip\s*:\s*\*\*/i;
const H_SCORE    = /\*\*\s*Score\s*:\s*\*\*/i;

export function parseFeedbackSections(raw: string): FeedbackSections | null {
  const text = raw.replace(META_RE, "").trim();

  const gm = H_GRAMMAR.exec(text);
  const sm = H_SAMPLE.exec(text);
  const dm = H_DELIVERY.exec(text);
  const sc = H_SCORE.exec(text);

  // All four headers must be present for a complete parse
  if (!gm || !sm || !dm || !sc) return null;

  const grammarFix   = text.slice(gm.index + gm[0].length, sm.index).trim();
  const sampleAnswer = text.slice(sm.index + sm[0].length, dm.index).trim();
  const deliveryTip  = text.slice(dm.index + dm[0].length, sc.index).trim();
  const scoreLines   = text.slice(sc.index + sc[0].length).trim();

  // Extract [pattern tag] tokens from the grammar fix block.
  // These are the named error patterns the coach flagged.
  const patternTags = [...grammarFix.matchAll(/\[([^\]]+)\]/g)].map(
    (m) => m[1],
  );

  return { grammarFix, sampleAnswer, deliveryTip, scoreLines, patternTags };
}

// ── Streaming / partial parser ────────────────────────────────────────────────
// Progressively returns whatever sections have arrived so far.
// Unlike parseFeedbackSections, this never returns null — it always returns an
// object, but fields are undefined when their header hasn't appeared yet.

export interface PartialFeedbackSections {
  grammarFix?: string;    // undefined = header not yet seen
  sampleAnswer?: string;
  deliveryTip?: string;
  scoreLines?: string;
  patternTags: string[];  // extracted from grammarFix (empty until header appears)
}

export function parseFeedbackSectionsStreaming(raw: string): PartialFeedbackSections {
  const text = raw.replace(META_RE, "").trim();

  const gm = H_GRAMMAR.exec(text);
  const sm = H_SAMPLE.exec(text);
  const dm = H_DELIVERY.exec(text);
  const sc = H_SCORE.exec(text);

  const result: PartialFeedbackSections = { patternTags: [] };

  if (gm) {
    const end = sm?.index ?? text.length;
    result.grammarFix = text.slice(gm.index + gm[0].length, end).trim();
    result.patternTags = [
      ...result.grammarFix.matchAll(/\[([^\]]+)\]/g),
    ].map((m) => m[1]);
  }

  if (sm) {
    const end = dm?.index ?? text.length;
    result.sampleAnswer = text.slice(sm.index + sm[0].length, end).trim();
  }

  if (dm) {
    const end = sc?.index ?? text.length;
    result.deliveryTip = text.slice(dm.index + dm[0].length, end).trim();
  }

  if (sc) {
    result.scoreLines = text.slice(sc.index + sc[0].length).trim();
  }

  return result;
}
