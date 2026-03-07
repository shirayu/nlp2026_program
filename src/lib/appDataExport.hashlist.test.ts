import { describe, expect, it, vi } from "vitest";

function toBase64url(json: string): string {
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeZoomPayload(aUrl: string, bUrl?: string): string {
  const payload = {
    venueZoomUrls: {
      A: aUrl,
      ...(bUrl ? { B: bUrl } : {}),
    },
  };
  return toBase64url(JSON.stringify(payload));
}

describe("decodeZoomPayload with ZOOM_IMPORT_HASHES", () => {
  it("許可リスト内のハッシュならデコードできる", async () => {
    vi.resetModules();
    vi.doMock("../constants", () => ({
      APP_LOCALSTORAGE_PREFIX: "nlp2026-",
      ZOOM_IMPORT_HASHES: ["deadbeef", "cafebabe"],
    }));
    const mod = await import("./appDataExport");
    const encoded = encodeZoomPayload("https://zoom.us/j/111?pwd=aaa");
    const actualHash = await mod.buildZoomImportHash({ A: "https://zoom.us/j/111?pwd=aaa" });

    vi.resetModules();
    vi.doMock("../constants", () => ({
      APP_LOCALSTORAGE_PREFIX: "nlp2026-",
      ZOOM_IMPORT_HASHES: ["deadbeef", actualHash],
    }));
    const modWithMatchedHash = await import("./appDataExport");
    await expect(modWithMatchedHash.decodeZoomPayload(encoded)).resolves.toEqual({
      A: "https://zoom.us/j/111?pwd=aaa",
    });
  });

  it("許可リスト外のハッシュなら null を返す", async () => {
    vi.resetModules();
    vi.doMock("../constants", () => ({
      APP_LOCALSTORAGE_PREFIX: "nlp2026-",
      ZOOM_IMPORT_HASHES: ["aaaaaaaa", "bbbbbbbb"],
    }));
    const mod = await import("./appDataExport");
    const encoded = encodeZoomPayload("https://zoom.us/j/111?pwd=aaa");
    await expect(mod.decodeZoomPayload(encoded)).resolves.toBeNull();
  });

  it("旧A/B形式ハッシュも後方互換で受け入れる", async () => {
    const aUrl = "https://zoom.us/j/111?pwd=aaa";
    const legacyHash = await sha256Hex(JSON.stringify({ A: aUrl, B: "" }));

    vi.resetModules();
    vi.doMock("../constants", () => ({
      APP_LOCALSTORAGE_PREFIX: "nlp2026-",
      ZOOM_IMPORT_HASHES: [legacyHash],
    }));
    const mod = await import("./appDataExport");
    const encoded = encodeZoomPayload(aUrl);
    await expect(mod.decodeZoomPayload(encoded)).resolves.toEqual({ A: aUrl });
  });
});
