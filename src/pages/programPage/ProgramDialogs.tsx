import { AlertTriangle, X as CloseIcon, Github, Globe, Monitor, RefreshCw } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import {
  BUILD_GIT_DATE,
  BUILD_GIT_HASH,
  DEVELOPER_GITHUB_URL,
  DEVELOPER_NAME,
  DEVELOPER_WEBSITE_URL,
  LICENSE_NAME,
  OPERATOR_NAME,
  OPERATOR_REPOSITORY_URL,
  OPERATOR_WEBSITE_URL,
  PROJECT_REPOSITORY_URL,
} from "../../constants";
import type { DataReloadStatus } from "../../hooks/useConferenceData";
import type { BackupEntry } from "../../lib/appDataBackup";
import { ja } from "../../locales/ja";
import type {
  ConferenceData,
  LastUpdateEntry,
  PresentationId,
  SessionId,
  VenueZoomUrls,
  ZoomCustomUrls,
} from "../../types";
import { fullscreenDialogClassName } from "./utils";

type LastUpdateRow = { label: string; time: string };
type AppUpdateStatus = "idle" | "updating" | "no_change" | "error";
const ZOOM_VENUE_FIELDS = [
  { key: "A", label: () => ja.venueA },
  { key: "B", label: () => ja.venueB },
  { key: "C", label: () => ja.venueC },
  { key: "P", label: () => ja.venueP },
] as const;
const dialogFramePaddingStyle = {
  paddingTop: "max(1rem, env(safe-area-inset-top))",
  paddingRight: "max(1rem, env(safe-area-inset-right))",
  paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
  paddingLeft: "max(1rem, env(safe-area-inset-left))",
} as const;

export function formatBuildGitDate(value: string, locale?: string | string[], timeZone?: string): string {
  if (value === "unknown") return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function shortHash(value: string | null): string {
  if (!value) return "null";
  if (value.length <= 6) return value;
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

function omitHttps(value: string): string {
  return value.replace(/^https?:\/\//, "");
}

function normalizeComparableUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function normalizeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isAllowedZoomImportUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (host === "zoom.us" || host.endsWith(".zoom.us")) && url.pathname.startsWith("/j/");
  } catch {
    return false;
  }
}

function summarizeZoomCustomUrlCount(zoomCustomUrls?: ZoomCustomUrls): {
  venues: number;
  sessions: number;
  workshops: number;
  presentations: number;
} {
  const sessionIds = Object.keys(zoomCustomUrls?.sessions ?? {});
  const workshops = sessionIds.filter((id) => /^WS\d+$/.test(id)).length;
  return {
    venues: ZOOM_VENUE_FIELDS.filter(({ key }) => Boolean(zoomCustomUrls?.venues?.[key]?.trim())).length,
    sessions: sessionIds.length - workshops,
    workshops,
    presentations: Object.keys(zoomCustomUrls?.presentations ?? {}).length,
  };
}

function normalizeIdUrlRecord(entries: Array<[string, string]>): Record<string, string> {
  return Object.fromEntries(
    entries
      .map(([id, url]) => [id.trim(), normalizeUrl(url)] as const)
      .filter(([id, url]) => id.length > 0 && Boolean(url))
      .map(([id, url]) => [id, url as string] as const),
  );
}

function mergeUnknownIds(
  current: Record<string, string> | undefined,
  validIds: Set<string>,
  configured: Record<string, string>,
): Record<string, string> | undefined {
  const next = { ...configured };
  for (const [id, url] of Object.entries(current ?? {})) {
    if (!validIds.has(id) && !(id in configured)) {
      next[id] = url;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeZoomCustomUrls(
  current: ZoomCustomUrls | undefined,
  draftVenues: Partial<Record<keyof VenueZoomUrls, string>>,
  draftSessions: Record<SessionId, string>,
  draftPresentations: Record<PresentationId, string>,
  validSessionIds: Set<string>,
  validPresentationIds: Set<string>,
): ZoomCustomUrls | undefined {
  const venues = ZOOM_VENUE_FIELDS.reduce((acc, { key }) => {
    const value = normalizeUrl(draftVenues[key] ?? "");
    if (value) acc[key] = value;
    return acc;
  }, {} as VenueZoomUrls);
  const sessions = mergeUnknownIds(
    current?.sessions,
    validSessionIds,
    normalizeIdUrlRecord(Object.entries(draftSessions)),
  ) as Record<SessionId, string> | undefined;
  const presentations = mergeUnknownIds(
    current?.presentations,
    validPresentationIds,
    normalizeIdUrlRecord(Object.entries(draftPresentations)),
  ) as Record<PresentationId, string> | undefined;

  const next: ZoomCustomUrls = {
    ...(Object.keys(venues).length > 0 ? { venues } : {}),
    ...(sessions ? { sessions } : {}),
    ...(presentations ? { presentations } : {}),
  };
  return Object.keys(next).length > 0 ? next : undefined;
}

function ZoomCustomUrlDialog({
  open,
  data,
  zoomCustomUrls,
  onClose,
  onSave,
}: {
  open: boolean;
  data: ConferenceData;
  zoomCustomUrls?: ZoomCustomUrls;
  onClose: () => void;
  onSave: (value: ZoomCustomUrls | undefined) => void;
}) {
  const [venueDrafts, setVenueDrafts] = useState<Partial<Record<keyof VenueZoomUrls, string>>>({});
  const [sessionDrafts, setSessionDrafts] = useState<Record<SessionId, string>>({});
  const [presentationDrafts, setPresentationDrafts] = useState<Record<PresentationId, string>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<SessionId | "">("");
  const [selectedWorkshopSessionId, setSelectedWorkshopSessionId] = useState<SessionId | "">("");
  const [selectedPresentationId, setSelectedPresentationId] = useState<PresentationId | "">("");
  const [sessionInputUrl, setSessionInputUrl] = useState("");
  const [workshopInputUrl, setWorkshopInputUrl] = useState("");
  const [presentationInputUrl, setPresentationInputUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const zoomCustomUrlCount = summarizeZoomCustomUrlCount(zoomCustomUrls);

  useEffect(() => {
    if (!open) return;
    setVenueDrafts({
      A: zoomCustomUrls?.venues?.A ?? "",
      B: zoomCustomUrls?.venues?.B ?? "",
      C: zoomCustomUrls?.venues?.C ?? "",
      P: zoomCustomUrls?.venues?.P ?? "",
    });
    setSessionDrafts((zoomCustomUrls?.sessions ?? {}) as Record<SessionId, string>);
    setPresentationDrafts((zoomCustomUrls?.presentations ?? {}) as Record<PresentationId, string>);
    const sessionIds = Object.keys(data.sessions) as SessionId[];
    const workshopSessionIds = sessionIds.filter((id) => /^WS\d+$/.test(id));
    const normalSessionIds = sessionIds.filter((id) => !/^WS\d+$/.test(id));
    const presentationIds = Object.keys(data.presentations) as PresentationId[];
    setSelectedSessionId(normalSessionIds[0] ?? "");
    setSelectedWorkshopSessionId(workshopSessionIds[0] ?? "");
    setSelectedPresentationId(presentationIds[0] ?? "");
    setSessionInputUrl("");
    setWorkshopInputUrl("");
    setPresentationInputUrl("");
    setError(null);
  }, [open, zoomCustomUrls, data.sessions, data.presentations]);

  const validSessionIds = new Set(Object.keys(data.sessions));
  const validPresentationIds = new Set(Object.keys(data.presentations));
  const sessionOptionEntries = (
    Object.entries(data.sessions) as Array<[SessionId, ConferenceData["sessions"][string]]>
  ).filter(([id]) => !/^WS\d+$/.test(id));
  const workshopOptionEntries = (
    Object.entries(data.sessions) as Array<[SessionId, ConferenceData["sessions"][string]]>
  ).filter(([id]) => /^WS\d+$/.test(id));
  const workshopSessionIds = new Set(workshopOptionEntries.map(([id]) => id));
  const visibleSessionEntries = Object.entries(sessionDrafts).filter(
    ([id]) => validSessionIds.has(id) && !workshopSessionIds.has(id as SessionId),
  );
  const visibleWorkshopEntries = Object.entries(sessionDrafts).filter(([id]) =>
    workshopSessionIds.has(id as SessionId),
  );
  const visiblePresentationEntries = Object.entries(presentationDrafts).filter(([id]) => validPresentationIds.has(id));

  function handleAddSession() {
    setError(null);
    const url = normalizeUrl(sessionInputUrl);
    if (!selectedSessionId || !validSessionIds.has(selectedSessionId)) {
      setError(ja.zoomCustomUrlInvalidSessionId);
      return;
    }
    if (!url) {
      setSessionDrafts((current) => {
        const next = { ...current };
        Reflect.deleteProperty(next, selectedSessionId);
        return next;
      });
      setSessionInputUrl("");
      return;
    }
    if (!isAllowedZoomImportUrl(url)) {
      setError(ja.zoomCustomUrlInvalidUrl);
      return;
    }
    setSessionDrafts((current) => ({ ...current, [selectedSessionId]: url }));
    setSessionInputUrl("");
  }

  function handleAddWorkshopSession() {
    setError(null);
    const url = normalizeUrl(workshopInputUrl);
    if (
      !selectedWorkshopSessionId ||
      !validSessionIds.has(selectedWorkshopSessionId) ||
      !workshopSessionIds.has(selectedWorkshopSessionId)
    ) {
      setError(ja.zoomCustomUrlInvalidSessionId);
      return;
    }
    if (!url) {
      setSessionDrafts((current) => {
        const next = { ...current };
        Reflect.deleteProperty(next, selectedWorkshopSessionId);
        return next;
      });
      setWorkshopInputUrl("");
      return;
    }
    if (!isAllowedZoomImportUrl(url)) {
      setError(ja.zoomCustomUrlInvalidUrl);
      return;
    }
    setSessionDrafts((current) => ({ ...current, [selectedWorkshopSessionId]: url }));
    setWorkshopInputUrl("");
  }

  function handleAddPresentation() {
    setError(null);
    const url = normalizeUrl(presentationInputUrl);
    if (!selectedPresentationId || !validPresentationIds.has(selectedPresentationId)) {
      setError(ja.zoomCustomUrlInvalidPresentationId);
      return;
    }
    if (!url) {
      setPresentationDrafts((current) => {
        const next = { ...current };
        Reflect.deleteProperty(next, selectedPresentationId);
        return next;
      });
      setPresentationInputUrl("");
      return;
    }
    if (!isAllowedZoomImportUrl(url)) {
      setError(ja.zoomCustomUrlInvalidUrl);
      return;
    }
    setPresentationDrafts((current) => ({ ...current, [selectedPresentationId]: url }));
    setPresentationInputUrl("");
  }

  function handleSave() {
    setError(null);
    const allVenueUrls = Object.values(venueDrafts).map((value) => normalizeUrl(value ?? ""));
    if (allVenueUrls.some((value) => value && !isAllowedZoomImportUrl(value))) {
      setError(ja.zoomCustomUrlInvalidUrl);
      return;
    }
    const visibleSessionUrls = visibleSessionEntries.map(([, value]) => normalizeUrl(value) ?? "");
    if (visibleSessionUrls.some((value) => value && !isAllowedZoomImportUrl(value))) {
      setError(ja.zoomCustomUrlInvalidUrl);
      return;
    }
    const visiblePresentationUrls = visiblePresentationEntries.map(([, value]) => normalizeUrl(value) ?? "");
    if (visiblePresentationUrls.some((value) => value && !isAllowedZoomImportUrl(value))) {
      setError(ja.zoomCustomUrlInvalidUrl);
      return;
    }
    onSave(
      normalizeZoomCustomUrls(
        zoomCustomUrls,
        venueDrafts,
        sessionDrafts,
        presentationDrafts,
        validSessionIds,
        validPresentationIds,
      ),
    );
    onClose();
  }

  return (
    <dialog open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.zoomCustomUrlClose}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.zoomCustomUrlDialogTitle}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.zoomCustomUrlClose}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4" style={{ scrollbarGutter: "stable" }}>
            <p className="text-xs text-gray-600">
              {ja.zoomCustomUrlSummary(
                zoomCustomUrlCount.presentations,
                zoomCustomUrlCount.sessions,
                zoomCustomUrlCount.venues,
                zoomCustomUrlCount.workshops,
              )}
            </p>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

            <section className="rounded-lg border border-gray-200 bg-white px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.zoomCustomUrlPresentationSection}</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)_auto]">
                <select
                  value={selectedPresentationId}
                  onChange={(event) => setSelectedPresentationId(event.target.value as PresentationId)}
                  className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {(Object.keys(data.presentations) as PresentationId[]).map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={presentationInputUrl}
                  onChange={(event) => setPresentationInputUrl(event.target.value)}
                  className="min-w-0 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  placeholder="https://zoom.us/j/..."
                />
                <button
                  type="button"
                  onClick={handleAddPresentation}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {ja.zoomCustomUrlAdd}
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {visiblePresentationEntries.map(([id, url]) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    <span className="w-28 shrink-0 font-mono text-gray-700">{id}</span>
                    <span className="min-w-0 flex-1 truncate text-gray-600">{url}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPresentationDrafts((current) => {
                          const next = { ...current };
                          Reflect.deleteProperty(next, id);
                          return next;
                        })
                      }
                      className="rounded border border-rose-200 px-2 py-0.5 text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      {ja.zoomCustomUrlDelete}
                    </button>
                  </li>
                ))}
                {visiblePresentationEntries.length === 0 && (
                  <li className="text-xs text-gray-500">{ja.zoomCustomUrlNoEntries}</li>
                )}
              </ul>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.zoomCustomUrlSessionSection}</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)_auto]">
                <select
                  value={selectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value as SessionId)}
                  className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {sessionOptionEntries.map(([id, session]) => (
                    <option key={id} value={id}>
                      {`${id}${session.title ? ` - ${session.title}` : ""}`}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={sessionInputUrl}
                  onChange={(event) => setSessionInputUrl(event.target.value)}
                  className="min-w-0 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  placeholder="https://zoom.us/j/..."
                />
                <button
                  type="button"
                  onClick={handleAddSession}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {ja.zoomCustomUrlAdd}
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {visibleSessionEntries.map(([id, url]) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    <span className="w-20 shrink-0 font-mono text-gray-700">{id}</span>
                    <span className="min-w-0 flex-1 truncate text-gray-600">{url}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSessionDrafts((current) => {
                          const next = { ...current };
                          Reflect.deleteProperty(next, id);
                          return next;
                        })
                      }
                      className="rounded border border-rose-200 px-2 py-0.5 text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      {ja.zoomCustomUrlDelete}
                    </button>
                  </li>
                ))}
                {visibleSessionEntries.length === 0 && (
                  <li className="text-xs text-gray-500">{ja.zoomCustomUrlNoEntries}</li>
                )}
              </ul>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.zoomCustomUrlVenueSection}</h3>
              <div className="mt-2 space-y-2">
                {ZOOM_VENUE_FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="w-10 shrink-0">{label()}</span>
                    <input
                      type="url"
                      value={venueDrafts[key] ?? ""}
                      onChange={(event) => setVenueDrafts((current) => ({ ...current, [key]: event.target.value }))}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                      placeholder="https://zoom.us/j/..."
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.zoomCustomUrlWorkshopSection}</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)_auto]">
                <select
                  value={selectedWorkshopSessionId}
                  onChange={(event) => setSelectedWorkshopSessionId(event.target.value as SessionId)}
                  className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {workshopOptionEntries.map(([id, session]) => (
                    <option key={id} value={id}>
                      {`${id}${session.title ? ` - ${session.title}` : ""}`}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={workshopInputUrl}
                  onChange={(event) => setWorkshopInputUrl(event.target.value)}
                  className="min-w-0 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  placeholder="https://zoom.us/j/..."
                />
                <button
                  type="button"
                  onClick={handleAddWorkshopSession}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {ja.zoomCustomUrlAdd}
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {visibleWorkshopEntries.map(([id, url]) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    <span className="w-20 shrink-0 font-mono text-gray-700">{id}</span>
                    <span className="min-w-0 flex-1 truncate text-gray-600">{url}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSessionDrafts((current) => {
                          const next = { ...current };
                          Reflect.deleteProperty(next, id);
                          return next;
                        })
                      }
                      className="rounded border border-rose-200 px-2 py-0.5 text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      {ja.zoomCustomUrlDelete}
                    </button>
                  </li>
                ))}
                {visibleWorkshopEntries.length === 0 && (
                  <li className="text-xs text-gray-500">{ja.zoomCustomUrlNoEntries}</li>
                )}
              </ul>
            </section>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              {ja.zoomCustomUrlCancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              {ja.zoomCustomUrlSave}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function ZoomImportCodeDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (value: string) => Promise<boolean>;
}) {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setInvalid(false);
    setIsImporting(false);
  }, [open]);

  async function handleImport() {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const accepted = await onImport(code);
      if (!accepted) {
        setInvalid(true);
        return;
      }
      onClose();
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <dialog open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.zoomImportCodeDialogTitle}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.zoomImportCodeDialogTitle}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.zoomImportCodeDialogTitle}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.zoomImportCodeDescription}</p>
            {invalid && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{ja.zoomImportCodeInvalid}</p>
            )}
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none"
              placeholder={ja.zoomImportCodePlaceholder}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.zoomCustomUrlCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting}
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                {isImporting ? ja.zoomImportCodeRunning : ja.zoomImportCodeRun}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function SettingsImportCodeDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (value: string) => Promise<boolean>;
}) {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setInvalid(false);
    setIsImporting(false);
  }, [open]);

  async function handleImport() {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const accepted = await onImport(code);
      if (!accepted) {
        setInvalid(true);
        return;
      }
      onClose();
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <dialog open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.settingsImportCodeDialogTitle}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.settingsImportCodeDialogTitle}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.settingsImportCodeDialogTitle}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.settingsImportCodeDescription}</p>
            {invalid && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{ja.settingsImportCodeInvalid}</p>
            )}
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none"
              placeholder={ja.settingsImportCodePlaceholder}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.zoomCustomUrlCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting}
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                {isImporting ? ja.settingsImportCodeRunning : ja.settingsImportCodeRun}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function buildLastUpdateRows(lastUpdate?: Record<string, LastUpdateEntry>): {
  mainRow: LastUpdateRow | null;
  secondaryRows: LastUpdateRow[];
} {
  const rows = [
    { key: "program_main", label: ja.programMainLastUpdatedAt },
    { key: "workshop", label: ja.workshopLastUpdatedAt },
    { key: "invitedpapers", label: ja.invitedpapersLastUpdatedAt },
    { key: "youtube", label: ja.youtubeLastUpdatedAt },
    { key: "slack", label: ja.slackLastUpdatedAt },
  ]
    .map(({ key, label }) => {
      const entry = lastUpdate?.[key];
      if (!entry) return null;
      return {
        label,
        time: `${formatBuildGitDate(entry.time, undefined, "Asia/Tokyo")} (${shortHash(entry.sha256)})`,
      };
    })
    .filter((row): row is LastUpdateRow => row !== null);

  return {
    mainRow: rows.find((row) => row.label === ja.programMainLastUpdatedAt) ?? null,
    secondaryRows: rows.filter((row) => row.label !== ja.programMainLastUpdatedAt),
  };
}

type InstallContext = { isStandalone: boolean; isIos: boolean };

type InstallDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  dataGeneratedAt?: string;
  lastUpdate?: Record<string, LastUpdateEntry>;
  isReloadingData: boolean;
  reloadDataStatus: DataReloadStatus;
  isUpdatingApp: boolean;
  appUpdateStatus: AppUpdateStatus;
  installContext: InstallContext;
  hasInstallPrompt: boolean;
  onClose: () => void;
  onReloadData: () => void;
  onUpdateApp: () => void;
  onInstall: () => void;
};

type LastUpdateDetailsProps = {
  formattedDataGeneratedAt: string | null;
  mainRow: LastUpdateRow | null;
  secondaryRows: LastUpdateRow[];
};

function InstallActionSection({
  installContext,
  hasInstallPrompt,
  onInstall,
}: {
  installContext: InstallContext;
  hasInstallPrompt: boolean;
  onInstall: () => void;
}) {
  if (installContext.isStandalone) {
    return (
      <>
        <p className="font-bold text-gray-800">{ja.installGuideInstalledLead}</p>
        <p className="mt-2 text-gray-500">{ja.installGuideInstalledDescription}</p>
      </>
    );
  }

  if (installContext.isIos) {
    return (
      <>
        <p className="font-bold text-gray-800">{ja.installGuideIosLead}</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-gray-600">
          {ja.installGuideIosSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </>
    );
  }

  if (hasInstallPrompt) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onInstall}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          {ja.installNow}
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="font-bold text-gray-800">{ja.installGuideUnsupportedLead}</p>
      <p className="mt-2 text-gray-500">{ja.installGuideUnsupportedDescription}</p>
    </>
  );
}

function LastUpdateDetails({ formattedDataGeneratedAt, mainRow, secondaryRows }: LastUpdateDetailsProps) {
  if (!formattedDataGeneratedAt && !mainRow && secondaryRows.length === 0) {
    return null;
  }

  return (
    <dl className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-sm">
      {formattedDataGeneratedAt && (
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
          <dt className="text-gray-500">{ja.dataGeneratedAt}</dt>
          <dd className="min-w-0 break-all font-mono text-left text-gray-800">{formattedDataGeneratedAt}</dd>
        </div>
      )}
      {mainRow && (
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
          <dt className="text-gray-500">{mainRow.label}</dt>
          <dd className="min-w-0 break-all font-mono text-left text-gray-800">{mainRow.time}</dd>
        </div>
      )}
      {secondaryRows.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white px-2 py-1">
          <summary className="cursor-pointer text-xs text-gray-600">{ja.otherSources}</summary>
          {secondaryRows.map((row) => (
            <div key={row.label} className="mt-2 grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
              <dt className="text-gray-500">{row.label}</dt>
              <dd className="min-w-0 break-all font-mono text-left text-gray-800">{row.time}</dd>
            </div>
          ))}
        </details>
      )}
    </dl>
  );
}

function DataUpdateSection({
  isReloadingData,
  reloadDataStatus,
  formattedDataGeneratedAt,
  mainRow,
  secondaryRows,
  onReloadData,
}: {
  isReloadingData: boolean;
  reloadDataStatus: DataReloadStatus;
  formattedDataGeneratedAt: string | null;
  mainRow: LastUpdateRow | null;
  secondaryRows: LastUpdateRow[];
  onReloadData: () => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{ja.reloadData}</p>
        <button
          type="button"
          onClick={onReloadData}
          disabled={isReloadingData}
          className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
            isReloadingData ? "border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300 bg-white text-gray-600"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isReloadingData ? "animate-spin" : ""}`} />
          <span>{isReloadingData ? ja.reloadingData : ja.reloadDataShort}</span>
        </button>
      </div>
      {reloadDataStatus === "no_change" && <p className="mt-2 text-xs text-gray-500">{ja.reloadNoChanges}</p>}
      {reloadDataStatus === "error" && <p className="mt-2 text-xs text-rose-600">{ja.reloadFailed}</p>}
      <LastUpdateDetails
        formattedDataGeneratedAt={formattedDataGeneratedAt}
        mainRow={mainRow}
        secondaryRows={secondaryRows}
      />
    </section>
  );
}

function AppUpdateSection({
  isUpdatingApp,
  appUpdateStatus,
  onUpdateApp,
}: {
  isUpdatingApp: boolean;
  appUpdateStatus: AppUpdateStatus;
  onUpdateApp: () => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{ja.reloadApp}</p>
        <button
          type="button"
          onClick={onUpdateApp}
          disabled={isUpdatingApp}
          className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
            isUpdatingApp ? "border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300 bg-white text-gray-600"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isUpdatingApp ? "animate-spin" : ""}`} />
          <span>{isUpdatingApp ? ja.reloadingApp : ja.reloadAppShort}</span>
        </button>
      </div>
      {appUpdateStatus === "updating" && <p className="mt-2 text-xs text-gray-500">{ja.reloadAppFoundUpdate}</p>}
      {appUpdateStatus === "no_change" && <p className="mt-2 text-xs text-gray-500">{ja.reloadAppNoChanges}</p>}
      {appUpdateStatus === "error" && <p className="mt-2 text-xs text-rose-600">{ja.reloadAppFailed}</p>}
    </section>
  );
}

export function InstallDialog({
  dialogRef,
  open,
  dataGeneratedAt,
  lastUpdate,
  isReloadingData,
  reloadDataStatus,
  isUpdatingApp,
  appUpdateStatus,
  installContext,
  hasInstallPrompt,
  onClose,
  onReloadData,
  onUpdateApp,
  onInstall,
}: InstallDialogProps) {
  const formattedDataGeneratedAt = dataGeneratedAt ? formatBuildGitDate(dataGeneratedAt) : null;
  const { mainRow, secondaryRows } = buildLastUpdateRows(lastUpdate);

  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.closeInstallGuide}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
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
          <div
            className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 text-sm text-gray-700"
            style={{ scrollbarGutter: "stable" }}
          >
            <div className="space-y-2">
              <p>
                {ja.installGuideLead}
                {ja.installGuideDescription}
                <br />
                {ja.installGuideUpdateDescription}
              </p>
            </div>
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <InstallActionSection
                installContext={installContext}
                hasInstallPrompt={hasInstallPrompt}
                onInstall={onInstall}
              />
            </div>
            <DataUpdateSection
              isReloadingData={isReloadingData}
              reloadDataStatus={reloadDataStatus}
              formattedDataGeneratedAt={formattedDataGeneratedAt}
              mainRow={mainRow}
              secondaryRows={secondaryRows}
              onReloadData={onReloadData}
            />
            <AppUpdateSection
              isUpdatingApp={isUpdatingApp}
              appUpdateStatus={appUpdateStatus}
              onUpdateApp={onUpdateApp}
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SettingsExportDialog({
  open,
  exportUrl,
  onClose,
}: {
  open: boolean;
  exportUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(exportUrl);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <dialog open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.exportAppDataClose}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.exportAppDataDialogTitle}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.exportAppDataClose}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.exportAppDataDescription}</p>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {ja.exportAppDataZoomCustomUrlExcluded}
            </p>
            <textarea
              readOnly
              value={exportUrl}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 focus:outline-none"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.exportAppDataClose}
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                {copied ? ja.exportAppDataCopied : ja.exportAppDataCopy}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SettingsImportConfirmDialog({
  open,
  isInvalid,
  target = "settings",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  isInvalid: boolean;
  target?: "settings" | "zoom";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const title = target === "zoom" ? ja.importZoomDataDialogTitle : ja.importAppDataDialogTitle;
  const warning = target === "zoom" ? ja.importZoomDataWarning : ja.importAppDataWarning;
  const invalidMessage = target === "zoom" ? ja.importZoomDataInvalid : ja.importAppDataInvalid;
  const showBackupNote = target === "settings";
  const showVenueZoomPreservedNote = target === "settings";

  return (
    <dialog open={open} onClose={onCancel} onCancel={onCancel} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.importAppDataCancel}
          className="fixed inset-0 bg-black/55"
          onClick={onCancel}
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-800">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.importAppDataCancel}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-4 py-4">
            {isInvalid ? (
              <p className="text-sm text-red-600">{invalidMessage}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">{warning}</p>
                {showVenueZoomPreservedNote && (
                  <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
                    {ja.importAppDataVenueZoomPreserved}
                  </p>
                )}
                {showBackupNote && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {ja.importAppDataBackupNote}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.importAppDataCancel}
              </button>
              {!isInvalid && (
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  {ja.importAppDataConfirm}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SettingsDialog({
  dialogRef,
  open,
  data,
  showAuthors,
  useSlackAppLinks,
  zoomCustomUrls,
  includeSessionTitleForNoPresentationSessions,
  includeSessionTitleForPresentationSessions,
  showTimeAtPresentationLevel,
  onClose,
  onToggleShowAuthors,
  onToggleUseSlackAppLinks,
  onSetZoomCustomUrls,
  onImportSettingsFromCode,
  onImportZoomFromCode,
  onToggleIncludeSessionTitleForNoPresentationSessions,
  onToggleIncludeSessionTitleForPresentationSessions,
  onToggleShowTimeAtPresentationLevel,
  onExport,
  hasBackup,
  onRestore,
  onClearAllData,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  data: ConferenceData;
  showAuthors: boolean;
  useSlackAppLinks: boolean;
  zoomCustomUrls?: ZoomCustomUrls;
  includeSessionTitleForNoPresentationSessions: boolean;
  includeSessionTitleForPresentationSessions: boolean;
  showTimeAtPresentationLevel: boolean;
  onClose: () => void;
  onToggleShowAuthors: () => void;
  onToggleUseSlackAppLinks: () => void;
  onSetZoomCustomUrls: (value: ZoomCustomUrls | undefined) => void;
  onImportSettingsFromCode: (value: string) => Promise<boolean>;
  onImportZoomFromCode: (value: string) => Promise<boolean>;
  onToggleIncludeSessionTitleForNoPresentationSessions: () => void;
  onToggleIncludeSessionTitleForPresentationSessions: () => void;
  onToggleShowTimeAtPresentationLevel: () => void;
  onExport: () => void;
  hasBackup: boolean;
  onRestore: () => void;
  onClearAllData: () => void;
}) {
  const formattedBuildGitDate = formatBuildGitDate(BUILD_GIT_DATE);
  const [showZoomCustomUrlDialog, setShowZoomCustomUrlDialog] = useState(false);
  const [showSettingsImportCodeDialog, setShowSettingsImportCodeDialog] = useState(false);
  const [showZoomImportCodeDialog, setShowZoomImportCodeDialog] = useState(false);

  const shouldShowOperatorSection =
    OPERATOR_NAME !== DEVELOPER_NAME ||
    normalizeComparableUrl(OPERATOR_REPOSITORY_URL) !== normalizeComparableUrl(PROJECT_REPOSITORY_URL);

  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.closeDisplaySettings}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.settings}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.closeDisplaySettings}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto px-4 py-4" style={{ scrollbarGutter: "stable" }}>
            <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
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
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{ja.useSlackAppLinks}</span>
                <button
                  type="button"
                  onClick={onToggleUseSlackAppLinks}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${useSlackAppLinks ? "bg-indigo-600" : "bg-gray-300"}`}
                  aria-pressed={useSlackAppLinks}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${useSlackAppLinks ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{ja.showTimeAtPresentationLevel}</span>
                <button
                  type="button"
                  onClick={onToggleShowTimeAtPresentationLevel}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${showTimeAtPresentationLevel ? "bg-indigo-600" : "bg-gray-300"}`}
                  aria-pressed={showTimeAtPresentationLevel}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showTimeAtPresentationLevel ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </label>
              <section className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                <h3 className="text-sm font-semibold text-gray-800">{ja.sessionTitleSearchSettings}</h3>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700">{ja.includeSessionTitleForNoPresentationSessions}</span>
                    <button
                      type="button"
                      onClick={onToggleIncludeSessionTitleForNoPresentationSessions}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${includeSessionTitleForNoPresentationSessions ? "bg-indigo-600" : "bg-gray-300"}`}
                      aria-pressed={includeSessionTitleForNoPresentationSessions}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${includeSessionTitleForNoPresentationSessions ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700">{ja.includeSessionTitleForPresentationSessions}</span>
                    <button
                      type="button"
                      onClick={onToggleIncludeSessionTitleForPresentationSessions}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${includeSessionTitleForPresentationSessions ? "bg-indigo-600" : "bg-gray-300"}`}
                      aria-pressed={includeSessionTitleForPresentationSessions}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${includeSessionTitleForPresentationSessions ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </label>
                </div>
              </section>
              <section className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                <h3 className="text-sm font-semibold text-gray-800">{ja.zoomSettings}</h3>
                <p className="mt-1 text-xs text-gray-600">{ja.zoomCustomUrlDescription}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowZoomImportCodeDialog(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                  >
                    {ja.zoomCodeImport}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowZoomCustomUrlDialog(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                  >
                    {ja.zoomCustomUrlSettings}
                  </button>
                </div>
              </section>
            </section>
            <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.exportDataSectionTitle}</h3>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsImportCodeDialog(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                >
                  {ja.settingsCodeImport}
                </button>
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                >
                  {ja.exportAppData}
                </button>
                <button
                  type="button"
                  disabled={!hasBackup}
                  onClick={onRestore}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    hasBackup
                      ? "border-gray-300 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                      : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  }`}
                >
                  {ja.restoreBackup}
                </button>
              </div>
            </section>
            <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.iconLegend}</h3>
              <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                <li>{ja.legendPresenter}</li>
                <li className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                  <span>{ja.legendEnglish}</span>
                </li>
                <li className="flex items-center gap-1">
                  <Monitor className="h-3.5 w-3.5 text-green-400" />
                  <span>{ja.legendOnline}</span>
                </li>
              </ul>
            </section>
            {shouldShowOperatorSection && (
              <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <h3 className="text-sm font-semibold text-gray-800">{ja.operator}</h3>
                <dl className="mt-2 space-y-2 text-sm">
                  <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                    <dt className="text-gray-500">{ja.operator}</dt>
                    <dd className="min-w-0 text-left">
                      <a
                        href={OPERATOR_WEBSITE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                      >
                        {OPERATOR_NAME}
                      </a>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                    <dt className="text-gray-500">{ja.projectRepository}</dt>
                    <dd className="min-w-0 text-left">
                      <a
                        href={OPERATOR_REPOSITORY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                      >
                        {omitHttps(OPERATOR_REPOSITORY_URL)}
                      </a>
                    </dd>
                  </div>
                </dl>
              </section>
            )}
            <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.softwareInfo}</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.developer}</dt>
                  <dd className="min-w-0 text-left">
                    <a
                      href={DEVELOPER_WEBSITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                    >
                      {DEVELOPER_NAME}
                    </a>
                    <a
                      href={DEVELOPER_GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={ja.projectRepository}
                      className="ml-2 inline-flex align-middle text-gray-500 transition-colors hover:text-gray-700"
                    >
                      <Github className="h-4 w-4" />
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
                      {omitHttps(PROJECT_REPOSITORY_URL)}
                    </a>
                  </dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.license}</dt>
                  <dd className="min-w-0 text-left text-gray-800">{LICENSE_NAME}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.gitHash}</dt>
                  <dd className="min-w-0 break-all font-mono text-left text-gray-800">{BUILD_GIT_HASH}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.gitDate}</dt>
                  <dd className="min-w-0 break-all font-mono text-left text-gray-800">{formattedBuildGitDate}</dd>
                </div>
              </dl>
            </section>
            <ClearAllDataSection onClearAllData={onClearAllData} />
          </div>
        </div>
      </div>
      <ZoomCustomUrlDialog
        open={showZoomCustomUrlDialog}
        data={data}
        zoomCustomUrls={zoomCustomUrls}
        onClose={() => setShowZoomCustomUrlDialog(false)}
        onSave={onSetZoomCustomUrls}
      />
      <SettingsImportCodeDialog
        open={showSettingsImportCodeDialog}
        onClose={() => setShowSettingsImportCodeDialog(false)}
        onImport={onImportSettingsFromCode}
      />
      <ZoomImportCodeDialog
        open={showZoomImportCodeDialog}
        onClose={() => setShowZoomImportCodeDialog(false)}
        onImport={onImportZoomFromCode}
      />
    </dialog>
  );
}

function ClearAllDataSection({ onClearAllData }: { onClearAllData: () => void }) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
      <h3 className="text-sm font-semibold text-red-800">{ja.clearAllDataSection}</h3>
      <p className="mt-1 text-xs text-red-600">{ja.clearAllDataDescription}</p>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onClearAllData}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
        >
          {ja.clearAllData}
        </button>
      </div>
    </section>
  );
}

const backupKindLabel: Record<BackupEntry["kind"], string> = {
  before_import: ja.restoreBackupKindBeforeImport,
  before_restore: ja.restoreBackupKindBeforeRestore,
};

export function RestoreBackupConfirmDialog({
  open,
  entries,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  entries: BackupEntry[];
  onConfirm: (kind: BackupEntry["kind"]) => void;
  onCancel: () => void;
}) {
  return (
    <dialog open={open} onClose={onCancel} onCancel={onCancel} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.restoreBackupCancel}
          className="fixed inset-0 bg-black/55"
          onClick={onCancel}
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3">
            <h2 className="text-sm font-bold text-amber-800">{ja.restoreBackupSection}</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.restoreBackupCancel}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.restoreBackupDescription}</p>
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.kind}>
                  <button
                    type="button"
                    onClick={() => onConfirm(entry.kind)}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
                  >
                    <span className="block text-sm font-medium text-amber-800">{backupKindLabel[entry.kind]}</span>
                    <span className="block font-mono text-xs text-amber-600">
                      {formatBuildGitDate(entry.savedAt, "ja-JP", "Asia/Tokyo")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.restoreBackupCancel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function ClearAllDataConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <dialog open={open} onClose={onCancel} onCancel={onCancel} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.clearAllDataCancel}
          className="fixed inset-0 bg-black/55"
          onClick={onCancel}
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-800">{ja.clearAllDataSection}</h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.clearAllDataCancel}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.clearAllDataDescription}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.clearAllDataCancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                {ja.clearAllDataConfirm}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
