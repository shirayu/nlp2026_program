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
  roomHasPresentationsOnSelectedDate,
  selectedTime,
  selectedRoom,
  filtersDisabled,
  onSelectRoom,
}: {
  rooms: string[];
  activeRooms?: string[];
  roomHasPresentationsOnSelectedDate?: Record<string, boolean>;
  selectedTime: string | null;
  selectedRoom: string | null;
  filtersDisabled: boolean;
  onSelectRoom: (room: string | null) => void;
}) {
  const activeRoomSet = new Set(activeRooms ?? rooms);

  function hasNoPresentationsOnSelectedDate(room: string): boolean {
    return roomHasPresentationsOnSelectedDate?.[room] === false;
  }

  function roomBorderClass(room: string): string {
    return roomThemeBorderClass(room);
  }

  function roomThemeBorderClass(room: string): string {
    const roomCode = getRoomCode(room);
    if (roomCode === "A") return "border-rose-400";
    if (roomCode === "B") return "border-amber-400";
    if (roomCode === "C") return "border-emerald-400";
    if (roomCode === "P") return "border-sky-400";
    if (roomCode === "Q") return "border-fuchsia-400";
    if (roomCode === "M") return "border-violet-400";
    return "border-indigo-300";
  }

  function roomActiveClass(room: string): string {
    const roomCode = getRoomCode(room);
    if (roomCode === "A") return "bg-rose-50 text-rose-800";
    if (roomCode === "B") return "bg-amber-50 text-amber-800";
    if (roomCode === "C") return "bg-emerald-50 text-emerald-800";
    if (roomCode === "P") return "bg-sky-50 text-sky-800";
    if (roomCode === "Q") return "bg-fuchsia-50 text-fuchsia-800";
    if (roomCode === "M") return "bg-violet-50 text-violet-800";
    return "bg-indigo-50 text-indigo-800";
  }

  function roomSelectedClass(room: string): string {
    const roomCode = getRoomCode(room);
    if (roomCode === "A") return "bg-rose-600 text-white";
    if (roomCode === "B") return "bg-amber-600 text-white";
    if (roomCode === "C") return "bg-emerald-600 text-white";
    if (roomCode === "P") return "bg-sky-600 text-white";
    if (roomCode === "Q") return "bg-fuchsia-600 text-white";
    if (roomCode === "M") return "bg-violet-600 text-white";
    return "bg-indigo-600 text-white";
  }

  function roomInactiveClass(room: string): string {
    const roomCode = getRoomCode(room);
    if (roomCode === "A") return "bg-rose-50/70 text-rose-700";
    if (roomCode === "B") return "bg-amber-50/70 text-amber-700";
    if (roomCode === "C") return "bg-emerald-50/70 text-emerald-700";
    if (roomCode === "P") return "bg-sky-50/70 text-sky-700";
    if (roomCode === "Q") return "bg-fuchsia-50/70 text-fuchsia-700";
    if (roomCode === "M") return "bg-violet-50/70 text-violet-700";
    return "bg-indigo-50/70 text-indigo-700";
  }

  function resolveRoomChipState(isSelected: boolean, isActive: boolean, room: string) {
    if (filtersDisabled) return "disabled" as const;
    if (selectedTime && !isActive) return "out_of_scope" as const;
    if (isSelected) return "selected" as const;
    if (isActive) return "active" as const;
    if (hasNoPresentationsOnSelectedDate(room)) return "no_presentation" as const;
    return "inactive" as const;
  }

  function roomChipClassByState(
    state: "disabled" | "out_of_scope" | "no_presentation" | "selected" | "active" | "inactive",
    room: string,
    isSelected: boolean,
  ): string {
    const handlers: Record<typeof state, () => string> = {
      disabled: () => "cursor-not-allowed bg-gray-200 text-gray-400 border-gray-300",
      out_of_scope: () =>
        isSelected ? "border-slate-300 bg-slate-500 text-white" : "border-slate-300 bg-slate-100 text-slate-600",
      no_presentation: () =>
        isSelected
          ? `${roomBorderClass(room)} ${roomSelectedClass(room)}`
          : `${roomBorderClass(room)} ${roomInactiveClass(room)}`,
      selected: () => `${roomBorderClass(room)} ${roomSelectedClass(room)}`,
      active: () => `${roomBorderClass(room)} ${roomActiveClass(room)}`,
      inactive: () => `${roomBorderClass(room)} ${roomInactiveClass(room)}`,
    };
    return handlers[state]();
  }

  function roomChipClass(room: string, isSelected: boolean, isActive: boolean): string {
    const state = resolveRoomChipState(isSelected, isActive, room);
    return roomChipClassByState(state, room, isSelected);
  }

  return (
    <div className="border-t border-gray-100 px-3 py-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={filtersDisabled}
          onClick={() => onSelectRoom(null)}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
            filtersDisabled
              ? "cursor-not-allowed bg-gray-200 text-gray-400 border-gray-300"
              : selectedRoom === null
                ? "border-lime-300 bg-lime-200 text-lime-950"
                : "border-lime-100 bg-lime-50 text-lime-900"
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
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${roomChipClass(room, isSelected, isActive)}`}
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
  timelineRoom,
  selectedTime,
  nowEnabled,
  rooms,
  activeRooms,
  roomHasPresentationsOnSelectedDate,
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
  timelineRoom?: string | null;
  selectedTime: string | null;
  nowEnabled: boolean;
  rooms: string[];
  activeRooms?: string[];
  roomHasPresentationsOnSelectedDate?: Record<string, boolean>;
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
              selectedRoom={timelineRoom ?? null}
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
              roomHasPresentationsOnSelectedDate={roomHasPresentationsOnSelectedDate}
              selectedTime={selectedTime}
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
