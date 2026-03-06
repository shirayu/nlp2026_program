import { appSettingsStorage, appSettingsStorageKey } from "../hooks/useAppSettings";
import { bookmarksStorage, bookmarksStorageKey } from "../hooks/useBookmarks";
import type { ExportPayload } from "../types";

const BACKUP_STORAGE_KEY = "nlp2026-backup";

export type BackupKind = "before_import" | "before_restore";

export type BackupEntry = {
  kind: BackupKind;
  payload: ExportPayload;
};

// ストレージ上のフォーマット: BackupEntry[]
function parseEntries(raw: string): BackupEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): BackupEntry[] => {
      if (!item || typeof item !== "object") return [];
      if (item.kind !== "before_import" && item.kind !== "before_restore") return [];
      if (!item.payload || typeof item.payload !== "object") return [];
      const settings = appSettingsStorage.parseAppSettings(JSON.stringify(item.payload.settings ?? null));
      const bookmarks = bookmarksStorage.parseBookmarks(JSON.stringify(item.payload.bookmarks ?? null));
      return [{ kind: item.kind, payload: { settings, bookmarks } }];
    });
  } catch {
    return [];
  }
}

function loadEntries(): BackupEntry[] {
  const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
  if (!raw) return [];
  return parseEntries(raw);
}

function saveEntries(entries: BackupEntry[]): void {
  window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(entries));
}

function readCurrentPayload(): ExportPayload {
  return {
    settings: appSettingsStorage.readAppSettings(),
    bookmarks: bookmarksStorage.readBookmarks(),
  };
}

/** 現在の状態を指定の種別でバックアップに追加する。同じ kind はすでにあれば上書きしない。 */
function saveIfAbsent(kind: BackupKind): void {
  const entries = loadEntries();
  if (entries.some((e) => e.kind === kind)) return;
  saveEntries([...entries, { kind, payload: readCurrentPayload() }]);
}

/**
 * インポート前のバックアップを保存する。
 * すでに before_import が存在する場合は上書きしない（最初のインポート前を永続保持）。
 */
export function saveBeforeImport(): void {
  saveIfAbsent("before_import");
}

/**
 * 復元前のバックアップを保存する。
 * すでに before_restore が存在する場合は上書きしない。
 */
export function saveBeforeRestore(): void {
  saveIfAbsent("before_restore");
}

/** 保存されているバックアップ一覧を返す（最大2件）。 */
export function listBackups(): BackupEntry[] {
  return loadEntries();
}

/** 指定 kind のバックアップを返す。存在しない場合は null。 */
export function loadBackup(kind: BackupKind): ExportPayload | null {
  return loadEntries().find((e) => e.kind === kind)?.payload ?? null;
}

/** バックアップが1件以上存在するか。 */
export function hasAnyBackup(): boolean {
  return loadEntries().length > 0;
}

export function clearAllData(): void {
  window.localStorage.removeItem(appSettingsStorageKey);
  window.localStorage.removeItem(bookmarksStorageKey);
  window.localStorage.removeItem(BACKUP_STORAGE_KEY);
}

export const backupStorageKey = BACKUP_STORAGE_KEY;
