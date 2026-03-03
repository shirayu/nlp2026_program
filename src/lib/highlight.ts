export interface HighlightSegment {
  text: string;
  matched: boolean;
  matchIndex?: number;
}

function getTerms(query: string): string[] {
  return [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))];
}

function findNextMatch(lowerText: string, terms: string[], cursor: number) {
  let nextMatchIndex = -1;
  let nextTermIndex = -1;
  let nextTerm = "";

  for (const [termIndex, term] of terms.entries()) {
    const matchIndex = lowerText.indexOf(term, cursor);
    if (matchIndex === -1) continue;

    const isEarlier = nextMatchIndex === -1 || matchIndex < nextMatchIndex;
    const isLongerAtSameIndex = matchIndex === nextMatchIndex && term.length > nextTerm.length;
    if (isEarlier || isLongerAtSameIndex) {
      nextMatchIndex = matchIndex;
      nextTermIndex = termIndex;
      nextTerm = term;
    }
  }

  return { nextMatchIndex, nextTermIndex, nextTerm };
}

function pushUnmatchedSegment(segments: HighlightSegment[], text: string, start: number, end?: number) {
  const segmentText = text.slice(start, end);
  if (segmentText.length > 0) {
    segments.push({ text: segmentText, matched: false });
  }
}

export function splitHighlightSegments(text: string, query: string): HighlightSegment[] {
  const terms = getTerms(query);
  if (terms.length === 0) {
    return [{ text, matched: false }];
  }

  const lowerText = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const { nextMatchIndex, nextTermIndex, nextTerm } = findNextMatch(lowerText, terms, cursor);

    if (nextMatchIndex === -1) {
      pushUnmatchedSegment(segments, text, cursor);
      break;
    }

    pushUnmatchedSegment(segments, text, cursor, nextMatchIndex);

    const nextCursor = nextMatchIndex + nextTerm.length;
    segments.push({
      text: text.slice(nextMatchIndex, nextCursor),
      matched: true,
      matchIndex: nextTermIndex,
    });
    cursor = nextCursor;
  }

  return segments.length > 0 ? segments : [{ text, matched: false }];
}
