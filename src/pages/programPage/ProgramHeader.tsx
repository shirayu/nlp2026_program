import { ChevronDown, ChevronUp, Download, Globe, MapPinned, Settings, Star } from "lucide-react";
import { TimelineFilter } from "../../components/TimelineFilter";
import { compareRooms, getRoomCode, OFFICIAL_SITE_URL, VENUE_GUIDE_URL, X_SEARCH_URL } from "../../constants";
import { formatJapaneseDate } from "../../lib/date";
import { ja } from "../../locales/ja";
import { HashIcon, XBrandIcon } from "./icons";
import { SearchField } from "./SearchField";
import { openSlackFromSpa } from "./utils";

function FilterHeader({
  query,
  isSearching,
  searchAll,
  bookmarkCount,
  bookmarkFilterActive,
  showSettings,
  showInstallButton,
  showInstallDialog,
  slackUrl,
  slackAppUrl,
  useSlackAppLinks,
  onQueryCommit,
  onToggleSearchAll,
  onToggleBookmarkFilter,
  onOpenSettings,
  onOpenInstallDialog,
}: {
  query: string;
  isSearching: boolean;
  searchAll: boolean;
  bookmarkCount: number;
  bookmarkFilterActive: boolean;
  showSettings: boolean;
  showInstallButton: boolean;
  showInstallDialog: boolean;
  slackUrl: string | null;
  slackAppUrl: string | null;
  useSlackAppLinks: boolean;
  onQueryCommit: (nextValue: string) => void;
  onToggleSearchAll: () => void;
  onToggleBookmarkFilter: () => void;
  onOpenSettings: () => void;
  onOpenInstallDialog: () => void;
}) {
  const trimmedQuery = query.trim();
  const searchScopeLabel = searchAll ? ja.searchAll : ja.searchFiltered;
  const bookmarkButtonDisabled = bookmarkCount === 0 && !bookmarkFilterActive;

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
        <div className="flex flex-col items-end gap-1">
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
            {slackUrl && (
              <a
                href={slackUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  if (useSlackAppLinks && slackAppUrl) {
                    openSlackFromSpa(event, slackUrl, slackAppUrl);
                  }
                }}
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label={ja.openSlack}
              >
                <HashIcon className="h-5 w-5" />
              </a>
            )}
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
              disabled={bookmarkButtonDisabled}
              onClick={onToggleBookmarkFilter}
              className={`relative rounded-full p-1.5 transition-colors ${
                bookmarkButtonDisabled
                  ? "cursor-not-allowed text-gray-400"
                  : bookmarkFilterActive
                    ? "bg-amber-100 text-amber-600"
                    : "text-amber-500 hover:text-amber-600"
              }`}
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
      </div>
      <div className="flex gap-2">
        <SearchField
          value={query}
          isSearching={isSearching}
          placeholder={ja.searchPlaceholder}
          onCommit={onQueryCommit}
        />
        {(trimmedQuery || bookmarkFilterActive) && (
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
  activeRooms,
  selectedRoom,
  filtersDisabled,
  onSelectRoom,
}: {
  rooms: string[];
  activeRooms?: string[];
  selectedRoom: string | null;
  filtersDisabled: boolean;
  onSelectRoom: (room: string | null) => void;
}) {
  const activeRoomSet = new Set(activeRooms ?? rooms);

  function roomBorderClass(room: string): string {
    const roomCode = getRoomCode(room);
    if (roomCode === "A") return "border-rose-400";
    if (roomCode === "B") return "border-amber-400";
    if (roomCode === "C") return "border-emerald-400";
    if (roomCode === "P") return "border-sky-400";
    if (roomCode === "Q") return "border-fuchsia-400";
    if (roomCode === "M") return "border-violet-400";
    return "border-slate-300";
  }

  function roomActiveClass(room: string): string {
    const roomCode = getRoomCode(room);
    if (roomCode === "A") return "bg-rose-50 text-rose-800";
    if (roomCode === "B") return "bg-amber-50 text-amber-800";
    if (roomCode === "C") return "bg-emerald-50 text-emerald-800";
    if (roomCode === "P") return "bg-sky-50 text-sky-800";
    if (roomCode === "Q") return "bg-fuchsia-50 text-fuchsia-800";
    if (roomCode === "M") return "bg-violet-50 text-violet-800";
    return "bg-slate-50 text-slate-700";
  }

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
        {rooms.map((room) => {
          const isSelected = selectedRoom === room;
          const isActive = activeRoomSet.has(room);
          return (
            <button
              key={room}
              type="button"
              disabled={filtersDisabled}
              onClick={() => onSelectRoom(room)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                filtersDisabled
                  ? "cursor-not-allowed bg-gray-200 text-gray-400 border-gray-300"
                  : isSelected
                    ? `${roomBorderClass(room)} bg-gray-700 text-white`
                    : isActive
                      ? `${roomBorderClass(room)} ${roomActiveClass(room)}`
                      : `${roomBorderClass(room)} bg-gray-200 text-gray-500`
              }`}
            >
              {room}
            </button>
          );
        })}
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

export function ProgramHeader({
  query,
  isSearching,
  searchAll,
  bookmarkCount,
  bookmarkFilterActive,
  showSettings,
  showInstallButton,
  showInstallDialog,
  dataGeneratedAt,
  slackUrl,
  slackAppUrl,
  useSlackAppLinks,
  allDates,
  filtersDisabled,
  selectedDate,
  showFilters,
  allTimes,
  timelineSegments,
  selectedTime,
  nowEnabled,
  rooms,
  activeRooms,
  selectedRoom,
  onQueryCommit,
  onToggleSearchAll,
  onToggleBookmarkFilter,
  onOpenSettings,
  onOpenInstallDialog,
  onSelectDate,
  onToggleFilters,
  onSelectTime,
  onSelectNow,
  onSelectRoom,
}: {
  query: string;
  isSearching: boolean;
  searchAll: boolean;
  bookmarkCount: number;
  bookmarkFilterActive: boolean;
  showSettings: boolean;
  showInstallButton: boolean;
  showInstallDialog: boolean;
  dataGeneratedAt?: string;
  slackUrl: string | null;
  slackAppUrl: string | null;
  useSlackAppLinks: boolean;
  allDates: string[];
  filtersDisabled: boolean;
  selectedDate: string | null;
  showFilters: boolean;
  allTimes: string[];
  timelineSegments: boolean[];
  selectedTime: string | null;
  nowEnabled: boolean;
  rooms: string[];
  activeRooms?: string[];
  selectedRoom: string | null;
  onQueryCommit: (nextValue: string) => void;
  onToggleSearchAll: () => void;
  onToggleBookmarkFilter: () => void;
  onOpenSettings: () => void;
  onOpenInstallDialog: () => void;
  onSelectDate: (date: string | null) => void;
  onToggleFilters: () => void;
  onSelectTime: (time: string | null) => void;
  onSelectNow: () => void;
  onSelectRoom: (room: string | null) => void;
}) {
  const roomSorted = [...rooms].sort(compareRooms);

  return (
    <header className="sticky top-0 z-30 shrink-0 bg-white shadow-sm">
      <FilterHeader
        query={query}
        isSearching={isSearching}
        searchAll={searchAll}
        bookmarkCount={bookmarkCount}
        bookmarkFilterActive={bookmarkFilterActive}
        showSettings={showSettings}
        showInstallButton={showInstallButton}
        showInstallDialog={showInstallDialog}
        slackUrl={slackUrl}
        slackAppUrl={slackAppUrl}
        useSlackAppLinks={useSlackAppLinks}
        onQueryCommit={onQueryCommit}
        onToggleSearchAll={onToggleSearchAll}
        onToggleBookmarkFilter={onToggleBookmarkFilter}
        onOpenSettings={onOpenSettings}
        onOpenInstallDialog={onOpenInstallDialog}
      />
      <div aria-disabled={filtersDisabled} className={filtersDisabled ? "bg-gray-100 text-gray-400" : "bg-white"}>
        <DateTabs
          allDates={allDates}
          filtersDisabled={filtersDisabled}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          showFilters={showFilters}
          onToggleFilters={onToggleFilters}
        />
        {showFilters && (
          <div id="program-filters">
            <TimelineFilter
              points={allTimes}
              activeSegments={timelineSegments}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onChange={onSelectTime}
              onSelectNow={onSelectNow}
              nowEnabled={nowEnabled}
              dataGeneratedAt={dataGeneratedAt}
              disabled={filtersDisabled}
            />
            <RoomChips
              rooms={roomSorted}
              activeRooms={activeRooms}
              selectedRoom={selectedRoom}
              filtersDisabled={filtersDisabled}
              onSelectRoom={onSelectRoom}
            />
          </div>
        )}
      </div>
    </header>
  );
}
