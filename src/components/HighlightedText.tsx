import { Fragment } from "react";
import { splitHighlightSegments } from "../lib/highlight";

const HIGHLIGHT_CLASSES = [
  "bg-indigo-200/80",
  "bg-emerald-200/80",
  "bg-rose-200/80",
  "bg-amber-200/80",
  "bg-sky-200/80",
];

export function HighlightedText({ text, query }: { text: string; query: string }) {
  const segments = splitHighlightSegments(text, query);
  let offset = 0;

  return segments.map((segment) => {
    const key = `${offset}-${segment.text}`;
    offset += segment.text.length;

    if (!segment.matched) {
      return <Fragment key={key}>{segment.text}</Fragment>;
    }

    return (
      <mark
        key={key}
        className={`rounded px-0.5 text-inherit ${HIGHLIGHT_CLASSES[(segment.matchIndex ?? 0) % HIGHLIGHT_CLASSES.length]}`}
      >
        {segment.text}
      </mark>
    );
  });
}
