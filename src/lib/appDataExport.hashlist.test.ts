import { describe, expect, it, vi } from "vitest";

function toBase64url(json: string): string {
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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
      ZOOM_IMPORT_HASHES: ["deadbeef", "cafebabe"],
    }));
    const mod = await import("./appDataExport");
    const encoded = encodeZoomPayload("https://zoom.us/j/111?pwd=aaa");
    const actualHash = await mod.buildZoomImportHash({ A: "https://zoom.us/j/111?pwd=aaa" });

    vi.resetModules();
    vi.doMock("../constants", () => ({
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
      ZOOM_IMPORT_HASHES: ["aaaaaaaa", "bbbbbbbb"],
    }));
    const mod = await import("./appDataExport");
    const encoded = encodeZoomPayload("https://zoom.us/j/111?pwd=aaa");
    await expect(mod.decodeZoomPayload(encoded)).resolves.toBeNull();
  });
});
