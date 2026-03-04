import { ChevronDown, FileText, Globe, Monitor, Star } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { hasPresentationHiddenSearchMatch } from "../lib/filters";
import { ja } from "../locales/ja";
import type { ConferenceData, PersonId, PresentationId, SessionId } from "../types";
import { HighlightedText } from "./HighlightedText";

interface ResolvedAuthor {
  personId: PersonId;
  name: string;
  affiliation: string | null;
  isPresenter: boolean;
}

function resolvePresentationMeta(
  data: ConferenceData,
  pid: PresentationId,
  detailsContent: ReactNode,
  onJumpToSession?: (sid: SessionId) => void,
) {
  const presentation = data.presentations[pid];
  if (!presentation) {
    return null;
  }

  const presenterName = presentation.presenter_id ? (data.persons[presentation.presenter_id]?.name ?? "") : "";
  const authorList: ResolvedAuthor[] = presentation.authors.map((author) => ({
    personId: author.person_id,
    name: data.persons[author.person_id]?.name ?? author.person_id,
    affiliation: author.affiliation_id ? (data.affiliations[author.affiliation_id]?.name ?? null) : null,
    isPresenter: author.person_id === presentation.presenter_id,
  }));
  const hasDetails =
    authorList.length > 0 || Boolean(detailsContent) || Boolean(presentation.oral_session_id && onJumpToSession);

  return {
    presentation,
    presenterName,
    authorList,
    hasDetails,
  };
}

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

function PresentationSummary({
  title,
  query,
  showAuthors,
  presenterName,
  isEnglish,
  isOnline,
  secondaryContent,
}: {
  title: string;
  query: string;
  showAuthors: boolean;
  presenterName: string;
  isEnglish: boolean;
  isOnline: boolean;
  secondaryContent?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium leading-snug text-gray-800">
        <HighlightedText text={title} query={query} />
      </p>
      {showAuthors ? (
        <PresentationMeta presenterName={presenterName} query={query} isEnglish={isEnglish} isOnline={isOnline} />
      ) : (
        (isEnglish || isOnline) && <PresentationFlags isEnglish={isEnglish} isOnline={isOnline} />
      )}
      {secondaryContent}
    </div>
  );
}

function PresentationAuthors({
  authors,
  query,
  onPersonClick,
}: {
  authors: ResolvedAuthor[];
  query: string;
  onPersonClick?: (id: PersonId) => void;
}) {
  if (authors.length === 0) {
    return null;
  }

  return (
    <p className="text-xs text-gray-600">
      {authors.map((author, index) => (
        <span key={`${author.personId}-${author.affiliation ?? "none"}-${author.isPresenter ? "presenter" : "author"}`}>
          {index > 0 && ", "}
          <AuthorName author={author} query={query} onPersonClick={onPersonClick} />
          {author.affiliation && (
            <span className="text-gray-400">
              {" "}
              (
              <HighlightedText text={author.affiliation} query={query} />)
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

function AuthorName({
  author,
  query,
  onPersonClick,
}: {
  author: ResolvedAuthor;
  query: string;
  onPersonClick?: (id: PersonId) => void;
}) {
  const className = author.isPresenter ? "font-semibold text-indigo-700" : "text-gray-700";

  if (!onPersonClick) {
    return (
      <span className={className}>
        {author.isPresenter && "○"}
        <HighlightedText text={author.name} query={query} />
      </span>
    );
  }

  return (
    <button type="button" className={`hover:underline ${className}`} onClick={() => onPersonClick(author.personId)}>
      {author.isPresenter && "○"}
      <HighlightedText text={author.name} query={query} />
    </button>
  );
}

function PresentationDetails({
  open,
  hasDetails,
  authors,
  query,
  onPersonClick,
  detailsContent,
  oralSessionId,
  onJumpToSession,
}: {
  open: boolean;
  hasDetails: boolean;
  authors: ResolvedAuthor[];
  query: string;
  onPersonClick?: (id: PersonId) => void;
  detailsContent?: ReactNode;
  oralSessionId?: SessionId;
  onJumpToSession?: (sid: SessionId) => void;
}) {
  if (!open || !hasDetails) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1 pl-[3.5rem]">
      <PresentationAuthors authors={authors} query={query} onPersonClick={onPersonClick} />
      {detailsContent}
      {oralSessionId && onJumpToSession && (
        <button
          type="button"
          className="block text-xs text-indigo-600 hover:underline"
          onClick={() => onJumpToSession(oralSessionId)}
        >
          {ja.jumpToOralSession} {oralSessionId}
        </button>
      )}
    </div>
  );
}

export function PresentationListItem({
  pid,
  data,
  bookmarked,
  showAuthors,
  query,
  onToggleBookmark,
  onJumpToSession,
  onPersonClick,
  secondaryContent,
  detailsContent,
  className,
}: {
  pid: PresentationId;
  data: ConferenceData;
  bookmarked: boolean;
  showAuthors: boolean;
  query: string;
  onToggleBookmark: (id: PresentationId) => void;
  onJumpToSession?: (sid: SessionId) => void;
  onPersonClick?: (id: PersonId) => void;
  secondaryContent?: ReactNode;
  detailsContent?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const resolved = resolvePresentationMeta(data, pid, detailsContent, onJumpToSession);
  const shouldAutoOpen =
    resolved !== null && resolved.hasDetails && hasPresentationHiddenSearchMatch(data, pid, query, showAuthors);

  useEffect(() => {
    if (shouldAutoOpen) {
      setOpen(true);
    }
  }, [shouldAutoOpen]);

  if (!resolved) return null;

  const { presentation: p, presenterName, authorList, hasDetails } = resolved;

  function toggleOpen() {
    if (hasDetails) {
      setOpen((value) => !value);
    }
  }

  return (
    <li className={className ?? `px-4 py-2 ${open ? "bg-white/55" : "bg-transparent even:bg-white/35"}`}>
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto_auto] items-start gap-x-1">
        <div className="w-[3.25rem] shrink-0">
          <span className="mt-0.5 block text-pretty break-all font-mono text-xs leading-tight text-gray-400">
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
        <button type="button" className="col-start-2 min-w-0 text-left" onClick={toggleOpen} aria-expanded={open}>
          <PresentationSummary
            title={p.title}
            query={query}
            showAuthors={showAuthors}
            presenterName={presenterName}
            isEnglish={p.is_english}
            isOnline={p.is_online}
            secondaryContent={secondaryContent}
          />
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
          onClick={toggleOpen}
          aria-expanded={open}
          aria-label={open ? ja.collapsePresentationDetails : ja.expandPresentationDetails}
          disabled={!hasDetails}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""} ${
              hasDetails ? "" : "opacity-40"
            }`}
          />
        </button>
      </div>

      <PresentationDetails
        open={open}
        hasDetails={hasDetails}
        authors={authorList}
        query={query}
        onPersonClick={onPersonClick}
        detailsContent={detailsContent}
        oralSessionId={p.oral_session_id}
        onJumpToSession={onJumpToSession}
      />
    </li>
  );
}
