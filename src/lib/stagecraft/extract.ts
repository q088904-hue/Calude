// Pull the Sample Answer block out of feedback markdown.
// Returns null if it cannot be located, so the UI can disable the
// "memorize" affordance gracefully.

const SAMPLE_HEADER =
  /\*\*\s*Sample answer\s*\([^)]*\)\s*:?\s*\*\*\s*/i;
const NEXT_HEADER = /\*\*\s*(Delivery tip|Score|Patterns|Grammar)\s*[:*]/i;

export function extractSampleAnswer(feedback: string): string | null {
  const start = feedback.search(SAMPLE_HEADER);
  if (start === -1) return null;
  const headerMatch = feedback.slice(start).match(SAMPLE_HEADER);
  if (!headerMatch) return null;
  const bodyStart = start + headerMatch[0].length;

  const remainder = feedback.slice(bodyStart);
  const stop = remainder.search(NEXT_HEADER);
  const block = stop === -1 ? remainder : remainder.slice(0, stop);

  // Strip stray META and trailing whitespace.
  const cleaned = block.replace(/\[META\][\s\S]*?\[\/META\]/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}
