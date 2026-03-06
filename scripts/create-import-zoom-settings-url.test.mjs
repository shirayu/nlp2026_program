import { describe, expect, it } from "vitest";
import { buildImportZoomSettingsUrl, parseArgs } from "./create-import-zoom-settings-url.mjs";

function decodeHashPayload(url) {
  const hash = new URL(url).hash.slice(1);
  const encoded = hash.replace("import_zoom_settings=", "");
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
}

describe("create-import-zoom-settings-url", () => {
  it("A/B会場URLを含む import_zoom_settings URL を生成できる", () => {
    const url = buildImportZoomSettingsUrl({
      baseUrl: "https://example.github.io/nlp2026/",
      aUrl: "https://zoom.us/j/111?pwd=aaa",
      bUrl: "https://zoom.us/j/222?pwd=bbb",
      help: false,
    });
    expect(url).toContain("#import_zoom_settings=");
    expect(decodeHashPayload(url)).toEqual({
      venueZoomUrls: {
        A: "https://zoom.us/j/111?pwd=aaa",
        B: "https://zoom.us/j/222?pwd=bbb",
      },
    });
  });

  it("A/Bのどちらか片方だけでも生成できる", () => {
    const url = buildImportZoomSettingsUrl({
      baseUrl: "https://example.github.io/nlp2026/",
      aUrl: "https://zoom.us/j/111?pwd=aaa",
      bUrl: "",
      help: false,
    });
    expect(decodeHashPayload(url)).toEqual({
      venueZoomUrls: {
        A: "https://zoom.us/j/111?pwd=aaa",
      },
    });
  });

  it("A/Bが未指定ならエラー", () => {
    expect(() =>
      buildImportZoomSettingsUrl({
        baseUrl: "https://example.github.io/nlp2026/",
        aUrl: "",
        bUrl: "",
        help: false,
      }),
    ).toThrow("At least one of --a-url or --b-url is required");
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
      help: false,
    });
  });
});
