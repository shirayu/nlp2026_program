import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appSettingsStorageKey } from "../hooks/useAppSettings";
import { bookmarksStorageKey } from "../hooks/useBookmarks";
import type { ExportPayload } from "../types";
import {
  backupStorageKey,
  clearAllData,
  hasAnyBackup,
  listBackups,
  loadBackup,
  saveBeforeImport,
  saveBeforeRestore,
} from "./appDataBackup";

const settingsA = {
  showAuthors: true,
  useSlackAppLinks: false,
  includeSessionTitleForNoPresentationSessions: true,
  includeSessionTitleForPresentationSessions: false,
};
const bookmarksA = { presentationIds: ["a1", "a2"], sessionIds: ["s1"] };
const payloadA: ExportPayload = { settings: settingsA, bookmarks: bookmarksA };

const settingsB = {
  showAuthors: false,
  useSlackAppLinks: true,
  includeSessionTitleForNoPresentationSessions: false,
  includeSessionTitleForPresentationSessions: true,
};
const bookmarksB = { presentationIds: ["b1"], sessionIds: [] };
const payloadB: ExportPayload = { settings: settingsB, bookmarks: bookmarksB };

function makeLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

describe("hasAnyBackup / listBackups / loadBackup", () => {
  let fakeStorage: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    fakeStorage = makeLocalStorage();
    vi.stubGlobal("window", { localStorage: fakeStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("バックアップがない場合 hasAnyBackup は false、listBackups は空配列", () => {
    expect(hasAnyBackup()).toBe(false);
    expect(listBackups()).toEqual([]);
  });

  it("loadBackup は存在しない kind に対して null を返す", () => {
    expect(loadBackup("before_import")).toBeNull();
    expect(loadBackup("before_restore")).toBeNull();
  });

  it("before_import エントリを読み込める", () => {
    fakeStorage.setItem(backupStorageKey, JSON.stringify([{ kind: "before_import", payload: payloadA }]));
    expect(hasAnyBackup()).toBe(true);
    const entry = loadBackup("before_import");
    expect(entry?.settings).toEqual(settingsA);
    expect(entry?.bookmarks).toEqual(bookmarksA);
    expect(loadBackup("before_restore")).toBeNull();
  });

  it("2世代ある場合、両方を独立して読み込める", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([
        { kind: "before_import", payload: payloadA },
        { kind: "before_restore", payload: payloadB },
      ]),
    );
    const importEntry = loadBackup("before_import");
    const restoreEntry = loadBackup("before_restore");

    expect(importEntry?.settings).toEqual(settingsA);
    expect(importEntry?.bookmarks).toEqual(bookmarksA);
    expect(restoreEntry?.settings).toEqual(settingsB);
    expect(restoreEntry?.bookmarks).toEqual(bookmarksB);
  });

  it("2世代ある場合、listBackups は2件返す", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([
        { kind: "before_import", payload: payloadA },
        { kind: "before_restore", payload: payloadB },
      ]),
    );
    const entries = listBackups();
    expect(entries).toHaveLength(2);
    expect(entries[0].kind).toBe("before_import");
    expect(entries[1].kind).toBe("before_restore");
  });

  it("settings が部分的な場合はデフォルト値で補完される", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([{ kind: "before_import", payload: { settings: { showAuthors: false }, bookmarks: bookmarksA } }]),
    );
    const entry = loadBackup("before_import");
    expect(entry?.settings.showAuthors).toBe(false);
    expect(entry?.settings.useSlackAppLinks).toBe(true); // default
  });

  it("bookmarks が部分的な場合は空配列で補完される", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([{ kind: "before_import", payload: { settings: settingsA, bookmarks: {} } }]),
    );
    const entry = loadBackup("before_import");
    expect(entry?.bookmarks).toEqual({ presentationIds: [], sessionIds: [] });
  });

  it("破損したストレージは空配列として扱われる", () => {
    fakeStorage.setItem(backupStorageKey, "not-json");
    expect(hasAnyBackup()).toBe(false);
    expect(listBackups()).toEqual([]);
  });

  it("不明な kind のエントリは無視される", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([
        { kind: "unknown_kind", payload: payloadA },
        { kind: "before_import", payload: payloadB },
      ]),
    );
    const entries = listBackups();
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("before_import");
  });
});

describe("saveBeforeImport", () => {
  let fakeStorage: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    fakeStorage = makeLocalStorage();
    vi.stubGlobal("window", { localStorage: fakeStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("before_import がなければ現在の状態を保存する", () => {
    fakeStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsA));
    fakeStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarksA));

    saveBeforeImport();

    const entry = loadBackup("before_import");
    expect(entry?.settings).toEqual(settingsA);
    expect(entry?.bookmarks).toEqual(bookmarksA);
  });

  it("before_import がすでにある場合は上書きしない", () => {
    fakeStorage.setItem(backupStorageKey, JSON.stringify([{ kind: "before_import", payload: payloadA }]));
    fakeStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsB));

    saveBeforeImport();

    const entry = loadBackup("before_import");
    expect(entry?.settings).toEqual(settingsA); // 元のまま
  });

  it("before_restore はそのまま保持される", () => {
    fakeStorage.setItem(backupStorageKey, JSON.stringify([{ kind: "before_restore", payload: payloadB }]));
    fakeStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsA));

    saveBeforeImport();

    expect(loadBackup("before_import")?.settings).toEqual(settingsA);
    expect(loadBackup("before_restore")?.settings).toEqual(settingsB); // 残っている
  });
});

describe("saveBeforeRestore", () => {
  let fakeStorage: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    fakeStorage = makeLocalStorage();
    vi.stubGlobal("window", { localStorage: fakeStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("before_restore がなければ現在の状態を保存する", () => {
    fakeStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsB));
    fakeStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarksB));

    saveBeforeRestore();

    const entry = loadBackup("before_restore");
    expect(entry?.settings).toEqual(settingsB);
    expect(entry?.bookmarks).toEqual(bookmarksB);
  });

  it("before_restore がすでにある場合は上書きしない", () => {
    fakeStorage.setItem(backupStorageKey, JSON.stringify([{ kind: "before_restore", payload: payloadB }]));
    fakeStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsA));

    saveBeforeRestore();

    const entry = loadBackup("before_restore");
    expect(entry?.settings).toEqual(settingsB); // 元のまま
  });

  it("before_import はそのまま保持される", () => {
    fakeStorage.setItem(backupStorageKey, JSON.stringify([{ kind: "before_import", payload: payloadA }]));
    fakeStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsB));

    saveBeforeRestore();

    expect(loadBackup("before_import")?.settings).toEqual(settingsA); // 残っている
    expect(loadBackup("before_restore")?.settings).toEqual(settingsB);
  });
});

describe("2世代バックアップの選択", () => {
  let fakeStorage: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    fakeStorage = makeLocalStorage();
    vi.stubGlobal("window", { localStorage: fakeStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("before_import と before_restore が共存し、それぞれ独立した内容を持つ", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([
        { kind: "before_import", payload: payloadA },
        { kind: "before_restore", payload: payloadB },
      ]),
    );

    const importEntry = loadBackup("before_import");
    const restoreEntry = loadBackup("before_restore");

    // 2世代は互いに異なる内容
    expect(importEntry?.settings).not.toEqual(restoreEntry?.settings);
    expect(importEntry?.bookmarks).not.toEqual(restoreEntry?.bookmarks);
  });

  it("before_import を選んで復元しても before_restore は消えない", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([
        { kind: "before_import", payload: payloadA },
        { kind: "before_restore", payload: payloadB },
      ]),
    );

    // before_import を選んで復元する操作をシミュレート
    const chosen = loadBackup("before_import");
    expect(chosen?.settings).toEqual(settingsA);

    // before_restore はまだ残っている
    expect(loadBackup("before_restore")?.settings).toEqual(settingsB);
  });

  it("before_restore を選んで復元しても before_import は消えない", () => {
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([
        { kind: "before_import", payload: payloadA },
        { kind: "before_restore", payload: payloadB },
      ]),
    );

    // before_restore を選んで復元する操作をシミュレート
    const chosen = loadBackup("before_restore");
    expect(chosen?.settings).toEqual(settingsB);

    // before_import はまだ残っている
    expect(loadBackup("before_import")?.settings).toEqual(settingsA);
  });
});

describe("clearAllData", () => {
  let fakeStorage: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    fakeStorage = makeLocalStorage();
    vi.stubGlobal("window", { localStorage: fakeStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("設定・ブックマーク・バックアップをすべて削除する", () => {
    fakeStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsA));
    fakeStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarksA));
    fakeStorage.setItem(
      backupStorageKey,
      JSON.stringify([
        { kind: "before_import", payload: payloadA },
        { kind: "before_restore", payload: payloadB },
      ]),
    );

    clearAllData();

    expect(fakeStorage.getItem(appSettingsStorageKey)).toBeNull();
    expect(fakeStorage.getItem(bookmarksStorageKey)).toBeNull();
    expect(fakeStorage.getItem(backupStorageKey)).toBeNull();
    expect(hasAnyBackup()).toBe(false);
  });

  it("データが存在しない状態でも例外をスローしない", () => {
    expect(() => clearAllData()).not.toThrow();
  });
});
