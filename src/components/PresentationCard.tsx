import { ChevronDown, FileText, Globe, Monitor, Star } from "lucide-react";
import { useState } from "react";
import { ja } from "../locales/ja";
import type { ConferenceData, PersonId, PresentationId, SessionId } from "../types";
import { HighlightedText } from "./HighlightedText";

function PresentationMeta({
  presenterName,
  query,
  isEnglish,
  isOnline,
}: {
  presenterName: string;
  query: string;
  isEnglish: boolean;
  isOnline: boolean;
}) {
  return (
    <p className="mt-0.5 text-xs text-gray-500">
      {presenterName ? (
        <>
          ○
          <HighlightedText text={presenterName} query={query} />
        </>
      ) : (
        ja.noPresenter
      )}
      {isEnglish && <Globe className="ml-1 inline h-3 w-3 text-blue-400" />}
      {isOnline && <Monitor className="ml-1 inline h-3 w-3 text-green-400" />}
    </p>
  );
}

function PresentationFlags({ isEnglish, isOnline }: { isEnglish: boolean; isOnline: boolean }) {
  return (
    <p className="mt-0.5">
      {isEnglish && <Globe className="inline h-3 w-3 text-blue-400" />}
      {isOnline && <Monitor className="ml-1 inline h-3 w-3 text-green-400" />}
    </p>
  );
}

export function PresentationCard({
  pid,
  data,
  bookmarked,
  showAuthors,
  query,
  onPersonClick,
  onJumpToSession,
  onToggleBookmark,
}: {
  pid: PresentationId;
  data: ConferenceData;
  bookmarked: boolean;
  showAuthors: boolean;
  query: string;
  onPersonClick: (id: PersonId) => void;
  onJumpToSession: (sid: SessionId) => void;
  onToggleBookmark: (id: PresentationId) => void;
}) {
  const [open, setOpen] = useState(false);
  const p = data.presentations[pid];
  if (!p) return null;

  const presenterName = p.presenter_id ? (data.persons[p.presenter_id]?.name ?? "") : "";
  const authorList = p.authors.map((a) => ({
    personId: a.person_id,
    name: data.persons[a.person_id]?.name ?? a.person_id,
    aff: a.affiliation_id ? (data.affiliations[a.affiliation_id]?.name ?? null) : null,
    isPresenter: a.person_id === p.presenter_id,
  }));

  return (
    <li className={`px-4 py-2 ${open ? "bg-white/55" : "bg-transparent even:bg-white/35"}`}>
      <div className="flex items-start gap-2">
        <div className="shrink-0">
          <span className="mt-0.5 block font-mono text-xs text-gray-400">
            <HighlightedText text={pid} query={query} />
          </span>
          <button
            type="button"
            className={`mt-1 inline-flex rounded p-0.5 transition-colors ${
              bookmarked
                ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                : "text-gray-300 hover:bg-slate-100 hover:text-gray-500"
            }`}
            onClick={() => onToggleBookmark(pid)}
            aria-label={bookmarked ? ja.removeBookmark : ja.addBookmark}
            aria-pressed={bookmarked}
          >
            <Star className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
          </button>
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-gray-800">
              <HighlightedText text={p.title} query={query} />
            </p>
            {showAuthors && (
              <PresentationMeta
                presenterName={presenterName}
                query={query}
                isEnglish={p.is_english}
                isOnline={p.is_online}
              />
            )}
            {!showAuthors && (p.is_english || p.is_online) && (
              <PresentationFlags isEnglish={p.is_english} isOnline={p.is_online} />
            )}
          </div>
        </button>

        {p.pdf_url && (
          <a
            href={p.pdf_url}
            target="_blank"
            rel="noreferrer"
            aria-label={ja.abstractPdf}
            className="mt-0.5 shrink-0 rounded p-1 text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
            onClick={(event) => event.stopPropagation()}
          >
            <FileText className="h-4 w-4" />
          </a>
        )}
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-slate-100 hover:text-gray-600"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "発表詳細をたたむ" : "発表詳細を開く"}
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-1 pl-10">
          <p className="text-xs text-gray-600">
            {authorList.map((a, i) => (
              <span key={`${a.personId}-${a.aff ?? "none"}-${a.isPresenter ? "presenter" : "author"}`}>
                {i > 0 && ", "}
                <button
                  type="button"
                  className={`hover:underline ${a.isPresenter ? "font-semibold text-indigo-700" : "text-gray-700"}`}
                  onClick={() => onPersonClick(a.personId)}
                >
                  {a.isPresenter && "○"}
                  <HighlightedText text={a.name} query={query} />
                </button>
                {a.aff && (
                  <span className="text-gray-400">
                    {" "}
                    (
                    <HighlightedText text={a.aff} query={query} />)
                  </span>
                )}
              </span>
            ))}
          </p>
          {p.oral_session_id && (
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline"
              onClick={() => onJumpToSession(p.oral_session_id as SessionId)}
            >
              {ja.jumpToOralSession} {p.oral_session_id}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
