import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExportPayload } from "../types";
import {
  buildExportUrl,
  clearImportPendingFlag,
  clearZoomImportPendingFlag,
  decodePayload,
  decodeZoomPayload,
  encodePayload,
  extractImportFragment,
  extractZoomImportFragment,
  isAnyImportPending,
  isImportPending,
  isZoomImportPending,
  stripImportFragment,
  stripZoomImportFragment,
} from "./appDataExport";

const fullPayload: ExportPayload = {
  settings: {
    showAuthors: true,
    useSlackAppLinks: false,
    includeSessionTitleForNoPresentationSessions: false,
    includeSessionTitleForPresentationSessions: true,
    venueZoomUrls: {
      A: "https://example.com/custom-a",
    },
  },
  bookmarks: {
    presentationIds: ["p1", "p2"],
    sessionIds: ["s1"],
  },
};

const fullPayloadWithoutVenueZoom = {
  ...fullPayload,
  settings: {
    showAuthors: true,
    useSlackAppLinks: false,
    includeSessionTitleForNoPresentationSessions: false,
    includeSessionTitleForPresentationSessions: true,
  },
};

describe("encodePayload / decodePayload", () => {
  it("エンコード → デコードで元のペイロードに戻る", () => {
    expect(decodePayload(encodePayload(fullPayload))).toEqual(fullPayloadWithoutVenueZoom);
  });

  it("エンコード結果に Base64url 安全でない文字が含まれない", () => {
    const encoded = encodePayload(fullPayload);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("ブックマークが空でもデコードできる", () => {
    const payload: ExportPayload = {
      ...fullPayload,
      bookmarks: { presentationIds: [], sessionIds: [] },
    };
    expect(decodePayload(encodePayload(payload))).toEqual({
      ...fullPayloadWithoutVenueZoom,
      bookmarks: { presentationIds: [], sessionIds: [] },
    });
  });

  it("settings が不完全な場合はデフォルト値で補完される", () => {
    const partial = { settings: { showAuthors: false }, bookmarks: { presentationIds: ["p1"], sessionIds: [] } };
    const encoded = btoa(JSON.stringify(partial)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const result = decodePayload(encoded);
    expect(result?.settings).toEqual({
      showAuthors: false,
      useSlackAppLinks: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
    });
    expect(result?.bookmarks.presentationIds).toEqual(["p1"]);
  });

  it("bookmarks が不完全な場合は空配列で補完される", () => {
    const partial = { settings: fullPayload.settings, bookmarks: {} };
    const encoded = btoa(JSON.stringify(partial)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const result = decodePayload(encoded);
    expect(result?.bookmarks).toEqual({ presentationIds: [], sessionIds: [] });
  });

  it("bookmarks フィールドがない場合は空配列で補完される", () => {
    const partial = { settings: fullPayload.settings };
    const encoded = btoa(JSON.stringify(partial)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const result = decodePayload(encoded);
    expect(result?.bookmarks).toEqual({ presentationIds: [], sessionIds: [] });
  });

  it("不正な文字列のデコードは null を返す", () => {
    expect(decodePayload("!!!invalid!!!")).toBeNull();
  });

  it("Base64 としても JSON としても無効な文字列のデコードは null を返す", () => {
    expect(decodePayload("$$$")).toBeNull();
  });
});

describe("buildExportUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("フラグメントに import_settings= が含まれる URL を生成する", () => {
    vi.stubGlobal("window", {
      location: new URL("https://example.github.io/nlp2026/"),
    });
    const url = buildExportUrl(fullPayload);
    expect(url).toContain("#import_settings=");
  });

  it("フラグメントをデコードすると元のペイロードに戻る", () => {
    vi.stubGlobal("window", {
      location: new URL("https://example.github.io/nlp2026/"),
    });
    const url = buildExportUrl(fullPayload);
    const hash = new URL(url).hash.slice(1);
    const encoded = hash.replace("import_settings=", "");
    expect(decodePayload(encoded)).toEqual(fullPayloadWithoutVenueZoom);
  });

  it("既存のフラグメントは import_settings に上書きされる", () => {
    vi.stubGlobal("window", {
      location: new URL("https://example.github.io/nlp2026/#session-123"),
    });
    const url = buildExportUrl(fullPayload);
    expect(url).toContain("#import_settings=");
    expect(url).not.toContain("session-123");
  });
});

describe("extractImportFragment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("import_settings= フラグメントがあればエンコード文字列を返す", () => {
    const encoded = encodePayload(fullPayload);
    vi.stubGlobal("window", {
      location: { hash: `#import_settings=${encoded}` },
    });
    expect(extractImportFragment()).toBe(encoded);
  });

  it("フラグメントがなければ null を返す", () => {
    vi.stubGlobal("window", {
      location: { hash: "" },
    });
    expect(extractImportFragment()).toBeNull();
  });

  it("別のフラグメントがあれば null を返す", () => {
    vi.stubGlobal("window", {
      location: { hash: "#session-123" },
    });
    expect(extractImportFragment()).toBeNull();
  });
});

describe("extractZoomImportFragment / decodeZoomPayload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("import_zoom_settings= フラグメントがあればエンコード文字列を返す", () => {
    const encoded = btoa(JSON.stringify({ venueZoomUrls: { A: "https://example.com/a" } }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    vi.stubGlobal("window", {
      location: { hash: `#import_zoom_settings=${encoded}` },
    });
    expect(extractZoomImportFragment()).toBe(encoded);
  });

  it("不正な zoom データのデコードは null を返す", () => {
    expect(decodeZoomPayload("not-valid")).toBeNull();
  });

  it("zoom データをデコードできる", () => {
    const encoded = btoa(
      JSON.stringify({
        venueZoomUrls: { A: "https://zoom.us/j/111?pwd=aaa", B: "https://us02web.zoom.us/j/222?pwd=bbb" },
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    expect(decodeZoomPayload(encoded)).toEqual({
      A: "https://zoom.us/j/111?pwd=aaa",
      B: "https://us02web.zoom.us/j/222?pwd=bbb",
    });
  });

  it("zoom.us / *.zoom.us 以外のドメインを含むと null を返す", () => {
    const encoded = btoa(
      JSON.stringify({
        venueZoomUrls: { A: "https://zoom.us/j/111?pwd=aaa", B: "https://example.com/room-b" },
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    expect(decodeZoomPayload(encoded)).toBeNull();
  });
});

function makeSessionStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
  };
}

describe("stripImportFragment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("import_settings フラグメントを除去する", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { hash: "#import_settings=abc", pathname: "/nlp2026/", search: "" },
      history: { replaceState },
      sessionStorage: makeSessionStorage(),
    });
    stripImportFragment();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/nlp2026/");
  });

  it("import_settings フラグメントを除去すると sessionStorage にフラグを立てる", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { hash: "#import_settings=abc", pathname: "/nlp2026/", search: "" },
      history: { replaceState },
      sessionStorage: makeSessionStorage(),
    });
    stripImportFragment();
    expect(isImportPending()).toBe(true);
  });

  it("import_settings フラグメントでなければ何もしない", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { hash: "#session-123", pathname: "/nlp2026/", search: "" },
      history: { replaceState },
      sessionStorage: makeSessionStorage(),
    });
    stripImportFragment();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("import_settings フラグメントでなければ sessionStorage にフラグを立てない", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { hash: "#session-123", pathname: "/nlp2026/", search: "" },
      history: { replaceState },
      sessionStorage: makeSessionStorage(),
    });
    stripImportFragment();
    expect(isImportPending()).toBe(false);
  });

  it("フラグメントがなければ何もしない", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { hash: "", pathname: "/nlp2026/", search: "" },
      history: { replaceState },
      sessionStorage: makeSessionStorage(),
    });
    stripImportFragment();
    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe("isImportPending / clearImportPendingFlag", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初期状態では false を返す", () => {
    vi.stubGlobal("window", { sessionStorage: makeSessionStorage() });
    expect(isImportPending()).toBe(false);
  });

  it("clearImportPendingFlag 後は false を返す", () => {
    const storage = makeSessionStorage();
    storage.setItem("import_settings_pending", "1");
    vi.stubGlobal("window", { sessionStorage: storage });
    clearImportPendingFlag();
    expect(isImportPending()).toBe(false);
  });

  it("フラグが立っていれば true を返す", () => {
    const storage = makeSessionStorage();
    storage.setItem("import_settings_pending", "1");
    vi.stubGlobal("window", { sessionStorage: storage });
    expect(isImportPending()).toBe(true);
  });
});

describe("zoom import pending", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("import_zoom_settings フラグメントを除去すると pending が true になる", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { hash: "#import_zoom_settings=abc", pathname: "/nlp2026/", search: "" },
      history: { replaceState },
      sessionStorage: makeSessionStorage(),
    });
    stripZoomImportFragment();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/nlp2026/");
    expect(isZoomImportPending()).toBe(true);
    expect(isAnyImportPending()).toBe(true);
  });

  it("clearZoomImportPendingFlag 後は false を返す", () => {
    const storage = makeSessionStorage();
    storage.setItem("import_zoom_settings_pending", "1");
    vi.stubGlobal("window", { sessionStorage: storage });
    clearZoomImportPendingFlag();
    expect(isZoomImportPending()).toBe(false);
  });

  it("通常 import pending が true でも isAnyImportPending は true", () => {
    const storage = makeSessionStorage();
    storage.setItem("import_settings_pending", "1");
    vi.stubGlobal("window", { sessionStorage: storage });
    expect(isImportPending()).toBe(true);
    expect(isAnyImportPending()).toBe(true);
  });
});
