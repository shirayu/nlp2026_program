import { useEffect, useMemo, useState } from "react";
import type { PresentationId, SessionId } from "../types";

const BOOKMARK_STORAGE_KEY = "nlp2026-bookmarks";

type StoredBookmarks = {
  presentationIds: PresentationId[];
  sessionIds: SessionId[];
};

function parseStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseBookmarks(value: string | null): StoredBookmarks {
  if (!value) {
    return {
      presentationIds: [],
      sessionIds: [],
    };
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return {
        presentationIds: parseStringIds(parsed),
        sessionIds: [],
      };
    }
    if (!parsed || typeof parsed !== "object") {
      return {
        presentationIds: [],
        sessionIds: [],
      };
    }
    return {
      presentationIds: parseStringIds(parsed.presentationIds),
      sessionIds: parseStringIds(parsed.sessionIds),
    };
  } catch {
    return {
      presentationIds: [],
      sessionIds: [],
    };
  }
}

function readBookmarks(): StoredBookmarks {
  if (typeof window === "undefined") {
    return {
      presentationIds: [],
      sessionIds: [],
    };
  }
  return parseBookmarks(window.localStorage.getItem(BOOKMARK_STORAGE_KEY));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<StoredBookmarks>(() => readBookmarks());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const bookmarkedPresentationIds = useMemo(() => new Set(bookmarks.presentationIds), [bookmarks.presentationIds]);
  const bookmarkedSessionIds = useMemo(() => new Set(bookmarks.sessionIds), [bookmarks.sessionIds]);

  function toggleBookmark(presentationId: PresentationId) {
    setBookmarks((current) => ({
      ...current,
      presentationIds: current.presentationIds.includes(presentationId)
        ? current.presentationIds.filter((id) => id !== presentationId)
        : [...current.presentationIds, presentationId],
    }));
  }

  function toggleSessionBookmark(sessionId: SessionId) {
    setBookmarks((current) => ({
      ...current,
      sessionIds: current.sessionIds.includes(sessionId)
        ? current.sessionIds.filter((id) => id !== sessionId)
        : [...current.sessionIds, sessionId],
    }));
  }

  function clearBookmarks() {
    setBookmarks({
      presentationIds: [],
      sessionIds: [],
    });
  }

  function isBookmarked(presentationId: PresentationId) {
    return bookmarkedPresentationIds.has(presentationId);
  }

  function isSessionBookmarked(sessionId: SessionId) {
    return bookmarkedSessionIds.has(sessionId);
  }

  return {
    bookmarkIds: bookmarks.presentationIds,
    sessionBookmarkIds: bookmarks.sessionIds,
    bookmarkedPresentationIds,
    bookmarkedSessionIds,
    setBookmarks,
    clearBookmarks,
    isBookmarked,
    isSessionBookmarked,
    toggleBookmark,
    toggleSessionBookmark,
  };
}

export const bookmarksStorageKey = BOOKMARK_STORAGE_KEY;
export const bookmarksStorage = {
  parseBookmarks,
  readBookmarks,
};
