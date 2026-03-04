import type { MouseEvent } from "react";
import { getAvailableDates, getAvailableTimes } from "../../lib/filters";
import type { Session, SessionId } from "../../types";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const fullscreenDialogClassName =
  "backdrop:bg-black/40 fixed inset-0 z-50 m-0 h-screen max-h-none w-screen max-w-none border-0 bg-transparent p-0";

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;
}

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function openSlackFromSpa(event: MouseEvent<HTMLAnchorElement>, fallbackUrl: string, appUrl: string) {
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
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
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
  window.location.href = appUrl;
}

export function isWorkshopParentSession(sessionId: SessionId, allSessionIds: SessionId[]): boolean {
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

export function syncSearchAllWithBookmarkFilter(searchAll: boolean, nextBookmarkedOnly: boolean): boolean {
  return nextBookmarkedOnly ? true : searchAll;
}

export function shouldExitBookmarkFilter(bookmarkCount: number, bookmarkedOnly: boolean): boolean {
  return bookmarkedOnly && bookmarkCount === 0;
}

export function shouldDisableFilters(searchAll: boolean, trimmedQuery: string, bookmarkedOnly: boolean): boolean {
  return searchAll && (trimmedQuery.length > 0 || bookmarkedOnly);
}
