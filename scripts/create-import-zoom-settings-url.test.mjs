import { describe, expect, it } from "vitest";
import { buildImportZoomSettingsUrl, buildZoomImportHash, parseArgs } from "./create-import-zoom-settings-url.mjs";

function decodeHashPayload(url) {
  const hash = new URL(url).hash.slice(1);
  const encoded = hash.replace("import_zoom_settings=", "");
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
}

describe("create-import-zoom-settings-url", () => {
  it("A/B/C/P会場URLを含む import_zoom_settings URL を生成できる", async () => {
    const result = await buildImportZoomSettingsUrl({
      baseUrl: "https://example.github.io/nlp2026/",
      aUrl: "https://zoom.us/j/111?pwd=aaa",
      bUrl: "https://zoom.us/j/222?pwd=bbb",
      cUrl: "https://zoom.us/j/333?pwd=ccc",
      pUrl: "https://zoom.us/j/444?pwd=ddd",
      help: false,
    });
    const url = result.url;
    expect(url).toContain("#import_zoom_settings=");
    expect(result.hash).toBe(
      await buildZoomImportHash({
        A: "https://zoom.us/j/111?pwd=aaa",
        B: "https://zoom.us/j/222?pwd=bbb",
        C: "https://zoom.us/j/333?pwd=ccc",
        P: "https://zoom.us/j/444?pwd=ddd",
      }),
    );
    expect(decodeHashPayload(url)).toEqual({
      venueZoomUrls: {
        A: "https://zoom.us/j/111?pwd=aaa",
        B: "https://zoom.us/j/222?pwd=bbb",
        C: "https://zoom.us/j/333?pwd=ccc",
        P: "https://zoom.us/j/444?pwd=ddd",
      },
    });
  });

  it("A/B/C/Pのどれか片方だけでも生成できる", async () => {
    const result = await buildImportZoomSettingsUrl({
      baseUrl: "https://example.github.io/nlp2026/",
      aUrl: "",
      bUrl: "",
      cUrl: "https://us02web.zoom.us/j/333?pwd=ccc",
      pUrl: "",
      help: false,
    });
    const url = result.url;
    expect(decodeHashPayload(url)).toEqual({
      venueZoomUrls: {
        C: "https://us02web.zoom.us/j/333?pwd=ccc",
      },
    });
  });

  it("zoom.us / *.zoom.us 以外のURLはエラー", async () => {
    await expect(() =>
      buildImportZoomSettingsUrl({
        baseUrl: "https://example.github.io/nlp2026/",
        aUrl: "https://example.com/room-a",
        bUrl: "",
        cUrl: "",
        pUrl: "",
        help: false,
      }),
    ).rejects.toThrow("--a-url must be a zoom.us or *.zoom.us URL with /j/ path");
  });

  it("/j/ 以外のパスはエラー", async () => {
    await expect(() =>
      buildImportZoomSettingsUrl({
        baseUrl: "https://example.github.io/nlp2026/",
        aUrl: "https://zoom.us/wc/join/111?pwd=aaa",
        bUrl: "",
        cUrl: "",
        pUrl: "",
        help: false,
      }),
    ).rejects.toThrow("--a-url must be a zoom.us or *.zoom.us URL with /j/ path");
  });

  it("A/B/C/Pが未指定ならエラー", async () => {
    await expect(() =>
      buildImportZoomSettingsUrl({
        baseUrl: "https://example.github.io/nlp2026/",
        aUrl: "",
        bUrl: "",
        cUrl: "",
        pUrl: "",
        help: false,
      }),
    ).rejects.toThrow("At least one of --a-url, --b-url, --c-url or --p-url is required");
  });

  it("pnpm run 経由の '--' を無視して引数を解釈できる", () => {
    const parsed = parseArgs([
      "--",
      "--base-url",
      "https://example.github.io/nlp2026/",
      "--a-url",
      "https://zoom.us/j/111?pwd=aaa",
    ]);
    expect(parsed).toEqual({
      baseUrl: "https://example.github.io/nlp2026/",
      aUrl: "https://zoom.us/j/111?pwd=aaa",
      bUrl: "",
      cUrl: "",
      pUrl: "",
      help: false,
    });
  });
});
