import {
  ChevronDown,
  ChevronUp,
  X as CloseIcon,
  Download,
  Globe,
  MapPinned,
  Search,
  Settings,
  Star,
} from "lucide-react";
import {
  type MouseEvent,
  type SVGProps,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PersonModal } from "../components/PersonModal";
import { SessionCard } from "../components/SessionCard";
import { TimelineFilter } from "../components/TimelineFilter";
import {
  AUTHOR_NAME,
  AUTHOR_WEBSITE_URL,
  compareRooms,
  getRoomTheme,
  OFFICIAL_SITE_URL,
  PROJECT_REPOSITORY_URL,
  SLACK_APP_URL,
  SLACK_WEB_URL,
  VENUE_GUIDE_URL,
  X_SEARCH_URL,
} from "../constants";
import { useBookmarks } from "../hooks/useBookmarks";
import { useConferenceData } from "../hooks/useConferenceData";
import { useSessionJump } from "../hooks/useSessionJump";
import { filterBookmarkedSessions } from "../lib/bookmarks";
import { formatJapaneseDate } from "../lib/date";
import { filterSessions, getAvailableDates, getAvailableRooms, getAvailableTimes } from "../lib/filters";
import { ja } from "../locales/ja";
import type { PersonId, Session, SessionId } from "../types";

function XBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2H21.5l-7.113 8.13L22.75 22h-6.547l-5.127-6.71L5.202 22H1.944l7.607-8.695L1.5 2h6.713l4.635 6.123zm-1.141 18.05h1.804L7.233 3.846H5.297z" />
    </svg>
  );
}

function HashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9 3 7.5 21M16.5 3 15 21M4 9h17M3 15h17"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const fullscreenDialogClassName =
  "backdrop:bg-black/40 fixed inset-0 z-50 m-0 h-screen max-h-none w-screen max-w-none border-0 bg-transparent p-0";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function openSlackFromSpa(event: MouseEvent<HTMLAnchorElement>) {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();

  const fallbackId = window.setTimeout(() => {
    window.open(SLACK_WEB_URL, "_blank", "noopener,noreferrer");
    cleanup();
  }, 700);

  const cleanup = () => {
    window.clearTimeout(fallbackId);
    window.removeEventListener("blur", cleanup);
    window.removeEventListener("pagehide", cleanup);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      cleanup();
    }
  };

  window.addEventListener("blur", cleanup, { once: true });
  window.addEventListener("pagehide", cleanup, { once: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.location.href = SLACK_APP_URL;
}

function isWorkshopParentSession(sessionId: SessionId, allSessionIds: SessionId[]): boolean {
  if (!/^WS\d+$/.test(sessionId)) return false;
  const childPrefix = `${sessionId}-`;
  return allSessionIds.some((sid) => sid.startsWith(childPrefix));
}

export function getNextScheduleTimePoint(
  sessions: Record<SessionId, Session>,
  now: Date,
): {
  date: string;
  time: string;
} | null {
  const today = toLocalIsoDate(now);
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const availableDates = getAvailableDates(sessions);

  for (const date of availableDates) {
    if (date < today) continue;

    const points = getAvailableTimes(sessions, date);
    if (points.length === 0) continue;

    if (date > today) {
      return { date, time: points[0] };
    }

    const nextTime = points.find((point) => toMinutes(point) * 60 >= currentSeconds);
    if (nextTime) {
      return { date, time: nextTime };
    }
  }

  return null;
}

function SearchField({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (nextValue: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);
  const lastCommittedValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastCommittedValueRef.current) {
      lastCommittedValueRef.current = value;
      setDraftValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (draftValue === lastCommittedValueRef.current) return;

    const timeoutId = window.setTimeout(() => {
      lastCommittedValueRef.current = draftValue;
      startTransition(() => {
        onCommit(draftValue);
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [draftValue, onCommit]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        id="program-search"
        name="program-search"
        placeholder={placeholder}
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        className="w-full rounded-full border border-gray-300 py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      />
    </div>
  );
}

function FilterHeader({
  query,
  searchAll,
  bookmarkCount,
  bookmarkFilterActive,
  showSettings,
  showInstallButton,
  showInstallDialog,
  onQueryCommit,
  onToggleSearchAll,
  onToggleBookmarkFilter,
  onOpenSettings,
  onOpenInstallDialog,
}: {
  query: string;
  searchAll: boolean;
  bookmarkCount: number;
  bookmarkFilterActive: boolean;
  showSettings: boolean;
  showInstallButton: boolean;
  showInstallDialog: boolean;
  onQueryCommit: (nextValue: string) => void;
  onToggleSearchAll: () => void;
  onToggleBookmarkFilter: () => void;
  onOpenSettings: () => void;
  onOpenInstallDialog: () => void;
}) {
  const trimmedQuery = query.trim();
  const searchScopeLabel = searchAll ? ja.searchAll : ja.searchFiltered;

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-indigo-700">
          <a
            href="."
            className="inline-flex flex-col items-start rounded-sm hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <span className="text-lg font-bold">{ja.programPageTitle}</span>
            <span className="text-xs font-medium text-indigo-500">{ja.programPageSubTitle}</span>
          </a>
        </h1>
        <div className="flex items-center gap-1">
          <a
            href={OFFICIAL_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label={ja.openOfficialSite}
          >
            <Globe className="h-5 w-5" />
          </a>
          <a
            href={SLACK_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openSlackFromSpa}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label={ja.openSlack}
          >
            <HashIcon className="h-5 w-5" />
          </a>
          <a
            href={X_SEARCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label={ja.openXSearch}
          >
            <XBrandIcon className="h-5 w-5" />
          </a>
          {showInstallButton && (
            <button
              type="button"
              onClick={onOpenInstallDialog}
              className={`rounded-full p-1.5 transition-colors ${showInstallDialog ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
              aria-label={ja.openInstallGuide}
            >
              <Download className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleBookmarkFilter}
            className={`relative rounded-full p-1.5 transition-colors ${bookmarkFilterActive ? "bg-amber-100 text-amber-600" : bookmarkCount > 0 ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-gray-600"}`}
            aria-label={ja.openBookmarks}
            aria-pressed={bookmarkFilterActive}
          >
            <Star className={`h-5 w-5 ${bookmarkFilterActive ? "fill-current" : ""}`} />
            {bookmarkCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                {bookmarkCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className={`rounded-full p-1.5 transition-colors ${showSettings ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
            aria-label={ja.openDisplaySettings}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <SearchField value={query} placeholder={ja.searchPlaceholder} onCommit={onQueryCommit} />
        {trimmedQuery && (
          <button
            type="button"
            onClick={onToggleSearchAll}
            className="shrink-0 flex flex-col items-center gap-0.5"
            title={searchScopeLabel}
          >
            <span className="text-xs text-gray-500 whitespace-nowrap">{searchScopeLabel}</span>
            <span
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${searchAll ? "bg-indigo-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${searchAll ? "translate-x-4" : "translate-x-0"}`}
              />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function DateTabs({
  allDates,
  filtersDisabled,
  selectedDate,
  onSelectDate,
  showFilters,
  onToggleFilters,
}: {
  allDates: string[];
  filtersDisabled: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 pr-2">
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        <button
          type="button"
          disabled={filtersDisabled}
          onClick={() => onSelectDate(null)}
          className={`px-2 py-2 text-[11px] font-medium whitespace-nowrap ${
            filtersDisabled
              ? "cursor-not-allowed text-gray-400"
              : selectedDate === null
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500"
          }`}
        >
          {ja.allDates}
        </button>
        {allDates.map((date) => (
          <button
            key={date}
            type="button"
            disabled={filtersDisabled}
            onClick={() => onSelectDate(date)}
            className={`px-2 py-2 text-[11px] font-medium whitespace-nowrap ${
              filtersDisabled
                ? "cursor-not-allowed text-gray-400"
                : selectedDate === date
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-500"
            }`}
          >
            {formatJapaneseDate(date)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onToggleFilters}
        className={`shrink-0 rounded-full p-1.5 transition-colors ${
          filtersDisabled ? "bg-gray-200 text-gray-500" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        }`}
        aria-expanded={showFilters}
        aria-controls="program-filters"
        aria-label={showFilters ? "絞り込みをたたむ" : "絞り込みを開く"}
      >
        {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
    </div>
  );
}

function RoomChips({
  rooms,
  selectedRoom,
  filtersDisabled,
  onSelectRoom,
}: {
  rooms: string[];
  selectedRoom: string | null;
  filtersDisabled: boolean;
  onSelectRoom: (room: string | null) => void;
}) {
  return (
    <div className="border-t border-gray-100 px-3 py-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={filtersDisabled}
          onClick={() => onSelectRoom(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            filtersDisabled
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : selectedRoom === null
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {ja.allRooms}
        </button>
        {rooms.map((room) => (
          <button
            key={room}
            type="button"
            disabled={filtersDisabled}
            onClick={() => onSelectRoom(room)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              filtersDisabled
                ? "cursor-not-allowed bg-gray-200 text-gray-400"
                : selectedRoom === room
                  ? getRoomTheme(room).chipActive
                  : getRoomTheme(room).chipInactive
            }`}
          >
            {room}
          </button>
        ))}
        <a
          href={filtersDisabled ? undefined : VENUE_GUIDE_URL}
          target={filtersDisabled ? undefined : "_blank"}
          rel={filtersDisabled ? undefined : "noreferrer"}
          aria-disabled={filtersDisabled}
          aria-label="会場案内PDFを開く"
          onClick={(event) => {
            if (filtersDisabled) {
              event.preventDefault();
            }
          }}
          className={`shrink-0 rounded-full border p-2 ${
            filtersDisabled
              ? "pointer-events-none border-gray-200 bg-gray-200 text-gray-400"
              : "border-gray-200 bg-white text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600"
          }`}
        >
          <MapPinned className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function InstallDialog({
  dialogRef,
  open,
  installContext,
  hasInstallPrompt,
  onClose,
  onInstall,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  open: boolean;
  installContext: { isStandalone: boolean; isIos: boolean };
  hasInstallPrompt: boolean;
  onClose: () => void;
  onInstall: () => void;
}) {
  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          aria-label={ja.closeInstallGuide}
          className="absolute inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.installApp}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.closeInstallGuide}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-4 py-4 text-sm text-gray-700">
            {installContext.isStandalone ? (
              <>
                <p>{ja.installGuideInstalledLead}</p>
                <p className="text-gray-500">{ja.installGuideInstalledDescription}</p>
              </>
            ) : installContext.isIos ? (
              <>
                <p>{ja.installGuideIosLead}</p>
                <ol className="list-decimal space-y-2 pl-5 text-gray-600">
                  <li>{ja.installGuideIosStep1}</li>
                  <li>{ja.installGuideIosStep2}</li>
                  <li>{ja.installGuideIosStep3}</li>
                </ol>
              </>
            ) : hasInstallPrompt ? (
              <>
                <p>{ja.installGuideLead}</p>
                <p className="text-gray-500">{ja.installGuideDescription}</p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    {ja.later}
                  </button>
                  <button
                    type="button"
                    onClick={onInstall}
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    {ja.installNow}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{ja.installGuideUnsupportedLead}</p>
                <p className="text-gray-500">{ja.installGuideUnsupportedDescription}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

function SettingsDialog({
  dialogRef,
  open,
  showAuthors,
  onClose,
  onToggleShowAuthors,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  open: boolean;
  showAuthors: boolean;
  onClose: () => void;
  onToggleShowAuthors: () => void;
}) {
  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          aria-label={ja.closeDisplaySettings}
          className="absolute inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.displaySettings}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.closeDisplaySettings}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2 px-4 py-4">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{ja.showAuthors}</span>
              <button
                type="button"
                onClick={onToggleShowAuthors}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${showAuthors ? "bg-indigo-600" : "bg-gray-300"}`}
                aria-pressed={showAuthors}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showAuthors ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </label>
            <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.aboutAuthor}</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.authorName}</dt>
                  <dd className="min-w-0 text-left text-gray-800">{AUTHOR_NAME}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.authorWebsite}</dt>
                  <dd className="min-w-0 text-left">
                    <a
                      href={AUTHOR_WEBSITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                    >
                      {AUTHOR_WEBSITE_URL}
                    </a>
                  </dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.projectRepository}</dt>
                  <dd className="min-w-0 text-left">
                    <a
                      href={PROJECT_REPOSITORY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                    >
                      {PROJECT_REPOSITORY_URL}
                    </a>
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default function ProgramPage() {
  const { data, sessionSlackLinks } = useConferenceData();
  const {
    bookmarkIds,
    sessionBookmarkIds,
    bookmarkedPresentationIds,
    bookmarkedSessionIds,
    toggleBookmark,
    toggleSessionBookmark,
  } = useBookmarks();
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [searchAll, setSearchAll] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showAuthors, setShowAuthors] = useState(true);
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const [personModal, setPersonModal] = useState<PersonId | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installContext, setInstallContext] = useState({ isStandalone: false, isIos: false });
  const mainRef = useRef<HTMLElement | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement | null>(null);
  const installDialogRef = useRef<HTMLDialogElement | null>(null);
  const { setJumpSession, sessionRefs } = useSessionJump();
  const deferredQuery = useDeferredValue(query);
  const deferredSelectedDate = useDeferredValue(selectedDate);
  const deferredSelectedRoom = useDeferredValue(selectedRoom);
  const deferredSelectedTime = useDeferredValue(selectedTime);
  const deferredSearchAll = useDeferredValue(searchAll);

  const allDates = useMemo(() => {
    if (!data) return [];
    return getAvailableDates(data.sessions);
  }, [data]);

  const allRooms = useMemo(() => {
    if (!data) return [];
    return getAvailableRooms(data.sessions, data.rooms, selectedDate, selectedTime);
  }, [data, selectedDate, selectedTime]);

  const allTimes = useMemo(() => {
    if (!data) return [];
    return getAvailableTimes(data.sessions, selectedDate);
  }, [data, selectedDate]);

  const timelineSegments = useMemo(() => {
    if (!data || allTimes.length < 2) return [];
    const sessionIds = Object.keys(data.sessions) as SessionId[];
    return allTimes.slice(0, -1).map((time) =>
      Object.entries(data.sessions).some(([sessionId, session]) => {
        if (isWorkshopParentSession(sessionId as SessionId, sessionIds)) return false;
        if (selectedDate && session.date !== selectedDate) return false;
        return toMinutes(session.start_time) <= toMinutes(time) && toMinutes(time) < toMinutes(session.end_time);
      }),
    );
  }, [data, allTimes, selectedDate]);

  const nextScheduleTimePoint = useMemo(() => {
    if (!data) return null;
    return getNextScheduleTimePoint(data.sessions, new Date());
  }, [data]);

  const nowEnabled = nextScheduleTimePoint !== null;

  useEffect(() => {
    if (selectedTime && allTimes.length > 0 && !allTimes.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [allTimes, selectedTime]);

  useEffect(() => {
    if (selectedRoom && allRooms.length > 0 && !allRooms.includes(selectedRoom)) {
      setSelectedRoom(null);
    }
  }, [allRooms, selectedRoom]);

  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!dialog) return;

    if (showSettings && !dialog.open) {
      dialog.showModal();
    } else if (!showSettings && dialog.open) {
      dialog.close();
    }
  }, [showSettings]);

  useEffect(() => {
    const dialog = installDialogRef.current;
    if (!dialog) return;

    if (showInstallDialog && !dialog.open) {
      dialog.showModal();
    } else if (!showInstallDialog && dialog.open) {
      dialog.close();
    }
  }, [showInstallDialog]);

  useEffect(() => {
    setInstallContext({
      isStandalone: isStandaloneMode(),
      isIos: isIosDevice(),
    });

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPromptEvent(null);
      setInstallContext((current) => ({ ...current, isStandalone: true }));
      setShowInstallDialog(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const baseFilteredSessions = useMemo(() => {
    if (!data) return [];
    return filterSessions(data, {
      query: deferredQuery,
      selectedDate: deferredSelectedDate,
      selectedTime: deferredSelectedTime,
      selectedRoom: deferredSelectedRoom,
      searchAll: deferredSearchAll,
    });
  }, [data, deferredQuery, deferredSearchAll, deferredSelectedDate, deferredSelectedRoom, deferredSelectedTime]);

  const filteredSessions = useMemo(() => {
    return filterBookmarkedSessions(
      baseFilteredSessions,
      bookmarkedPresentationIds,
      bookmarkedSessionIds,
      showBookmarkedOnly,
    );
  }, [baseFilteredSessions, bookmarkedPresentationIds, bookmarkedSessionIds, showBookmarkedOnly]);

  const trimmedQuery = query.trim();
  const filtersDisabled = trimmedQuery.length > 0 && searchAll;
  const searchScopeLabel = searchAll ? ja.searchAll : ja.searchFiltered;
  const showInstallButton = true;
  const matchedPresentationCount = useMemo(() => {
    return filteredSessions.reduce((total, item) => total + item.presIds.length, 0);
  }, [filteredSessions]);

  const roomSorted = useMemo(() => {
    return [...allRooms].sort(compareRooms);
  }, [allRooms]);

  function handleJumpToSession(sid: SessionId) {
    const targetSession = data?.sessions[sid];
    if (!targetSession) return;
    setSelectedDate(targetSession.date);
    setSelectedRoom(null);
    setSelectedTime(null);
    setJumpSession(sid);
  }

  function scrollContentToTop() {
    mainRef.current?.scrollTo({ top: 0 });
  }

  function scrollSessionToTop(sessionId: SessionId) {
    window.requestAnimationFrame(() => {
      sessionRefs.current[sessionId]?.scrollIntoView({ block: "start" });
    });
  }

  function handleToggleExpanded(sessionId: SessionId) {
    setSessionsExpanded((value) => {
      const nextValue = !value;
      if (nextValue) {
        scrollSessionToTop(sessionId);
      }
      return nextValue;
    });
  }

  function closeSettingsDialog() {
    setShowSettings(false);
  }

  function closeInstallDialog() {
    setShowInstallDialog(false);
  }

  function handleSelectNow() {
    if (!nextScheduleTimePoint) return;
    setSelectedDate(nextScheduleTimePoint.date);
    setSelectedTime(nextScheduleTimePoint.time);
    scrollContentToTop();
  }

  async function handleInstallApp() {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPromptEvent(null);
      closeInstallDialog();
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{ja.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-30 shrink-0 bg-white shadow-sm">
        <FilterHeader
          query={query}
          searchAll={searchAll}
          bookmarkCount={bookmarkIds.length + sessionBookmarkIds.length}
          bookmarkFilterActive={showBookmarkedOnly}
          showSettings={showSettings}
          showInstallButton={showInstallButton}
          showInstallDialog={showInstallDialog}
          onQueryCommit={setQuery}
          onToggleSearchAll={() => setSearchAll((value) => !value)}
          onToggleBookmarkFilter={() => {
            setShowBookmarkedOnly((value) => !value);
            scrollContentToTop();
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenInstallDialog={() => setShowInstallDialog(true)}
        />
        <div aria-disabled={filtersDisabled} className={filtersDisabled ? "bg-gray-100 text-gray-400" : "bg-white"}>
          <DateTabs
            allDates={allDates}
            filtersDisabled={filtersDisabled}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              scrollContentToTop();
            }}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((value) => !value)}
          />
          {showFilters && (
            <div id="program-filters">
              <TimelineFilter
                points={allTimes}
                activeSegments={timelineSegments}
                selectedTime={selectedTime}
                onChange={(time) => {
                  setSelectedTime(time);
                  scrollContentToTop();
                }}
                onSelectNow={handleSelectNow}
                nowEnabled={nowEnabled}
                disabled={filtersDisabled}
              />
              <RoomChips
                rooms={roomSorted}
                selectedRoom={selectedRoom}
                filtersDisabled={filtersDisabled}
                onSelectRoom={(room) => {
                  setSelectedRoom(room);
                  scrollContentToTop();
                }}
              />
            </div>
          )}
        </div>
      </header>

      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 pb-10">
          {(trimmedQuery || showBookmarkedOnly) && (
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-gray-500">
              <div className="flex flex-col gap-1">
                {trimmedQuery && <p>{ja.searchResultScope(searchScopeLabel)}</p>}
                {showBookmarkedOnly && <p className="text-amber-600">{ja.bookmarksFiltered}</p>}
              </div>
              <p>{ja.searchResultCount(matchedPresentationCount)}</p>
            </div>
          )}
          {filteredSessions.length === 0 && <p className="py-10 text-center text-gray-400">{ja.noResults}</p>}
          {filteredSessions.map(({ sessionId, session, presIds }) => (
            <SessionCard
              key={sessionId}
              bookmarkedPresentationIds={bookmarkedPresentationIds}
              bookmarkedSessionIds={bookmarkedSessionIds}
              sessionId={sessionId}
              session={session}
              sessionSlackUrl={sessionSlackLinks[sessionId]}
              presIds={presIds}
              data={data}
              showAuthors={showAuthors}
              query={trimmedQuery}
              expanded={sessionsExpanded}
              onToggleExpanded={() => handleToggleExpanded(sessionId)}
              onPersonClick={setPersonModal}
              onJumpToSession={handleJumpToSession}
              onToggleBookmark={toggleBookmark}
              onToggleSessionBookmark={toggleSessionBookmark}
              ref={(el) => {
                sessionRefs.current[sessionId] = el;
              }}
            />
          ))}
        </div>
      </main>

      {personModal && (
        <PersonModal
          personId={personModal}
          data={data}
          onClose={() => setPersonModal(null)}
          onJumpToSession={(sid) => {
            setPersonModal(null);
            handleJumpToSession(sid);
          }}
        />
      )}

      <InstallDialog
        dialogRef={installDialogRef}
        open={showInstallDialog}
        installContext={installContext}
        hasInstallPrompt={installPromptEvent !== null}
        onClose={closeInstallDialog}
        onInstall={() => void handleInstallApp()}
      />

      <SettingsDialog
        dialogRef={settingsDialogRef}
        open={showSettings}
        showAuthors={showAuthors}
        onClose={closeSettingsDialog}
        onToggleShowAuthors={() => setShowAuthors((value) => !value)}
      />
    </div>
  );
}
