import { useEffect, useMemo, useState } from "react";
import type { PresentationId } from "../types";

const BOOKMARK_STORAGE_KEY = "nlp2026-bookmarks";

function parseBookmarkIds(value: string | null): PresentationId[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PresentationId => typeof item === "string");
  } catch {
    return [];
  }
}

function readBookmarkIds(): PresentationId[] {
  if (typeof window === "undefined") return [];
  return parseBookmarkIds(window.localStorage.getItem(BOOKMARK_STORAGE_KEY));
}

export function useBookmarks() {
  const [bookmarkIds, setBookmarkIds] = useState<PresentationId[]>(() => readBookmarkIds());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarkIds));
  }, [bookmarkIds]);

  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  function toggleBookmark(presentationId: PresentationId) {
    setBookmarkIds((current) =>
      current.includes(presentationId) ? current.filter((id) => id !== presentationId) : [...current, presentationId],
    );
  }

  function clearBookmarks() {
    setBookmarkIds([]);
  }

  function isBookmarked(presentationId: PresentationId) {
    return bookmarkSet.has(presentationId);
  }

  return {
    bookmarkIds,
    clearBookmarks,
    isBookmarked,
    toggleBookmark,
  };
}

export const bookmarksStorageKey = BOOKMARK_STORAGE_KEY;
export const bookmarksStorage = {
  parseBookmarkIds,
  readBookmarkIds,
};
