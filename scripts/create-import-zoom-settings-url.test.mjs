import { describe, expect, it } from "vitest";
import { buildImportZoomSettingsUrl, buildZoomImportHash, parseArgs } from "./create-import-zoom-settings-url.mjs";

function decodeHashPayload(url) {
  const hash = new URL(url).hash.slice(1);
  const encoded = hash.replace("import_zoom_settings=", "");
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
}

describe("create-import-zoom-settings-url", () => {
  it("venues/sessions/presentations を含む URL を生成できる", async () => {
    const result = await buildImportZoomSettingsUrl({
      baseUrl: "https://example.github.io/nlp2026/",
      venues: ["A=https://zoom.us/j/111?pwd=aaa"],
      sessions: ["B1=https://zoom.us/j/222?pwd=bbb"],
      presentations: ["B1-1=https://zoom.us/j/333?pwd=ccc"],
      help: false,
    });

    expect(result.url).toContain("#import_zoom_settings=");
    expect(result.hash).toBe(
      await buildZoomImportHash({
        venues: { A: "https://zoom.us/j/111?pwd=aaa" },
        sessions: { B1: "https://zoom.us/j/222?pwd=bbb" },
        presentations: { "B1-1": "https://zoom.us/j/333?pwd=ccc" },
      }),
    );
    expect(decodeHashPayload(result.url)).toEqual({
      zoomCustomUrls: {
        venues: { A: "https://zoom.us/j/111?pwd=aaa" },
        sessions: { B1: "https://zoom.us/j/222?pwd=bbb" },
        presentations: { "B1-1": "https://zoom.us/j/333?pwd=ccc" },
      },
    });
  });

  it("不正な会場キーはエラー", async () => {
    await expect(() =>
      buildImportZoomSettingsUrl({
        baseUrl: "https://example.github.io/nlp2026/",
        venues: ["X=https://zoom.us/j/111?pwd=aaa"],
        sessions: [],
        presentations: [],
        help: false,
      }),
    ).rejects.toThrow("--venue key must be one of A/B/C/P");
  });

  it("URL が zoom.us 条件を満たさない場合エラー", async () => {
    await expect(() =>
      buildImportZoomSettingsUrl({
        baseUrl: "https://example.github.io/nlp2026/",
        venues: [],
        sessions: ["B1=https://example.com/j/111"],
        presentations: [],
        help: false,
      }),
    ).rejects.toThrow("--session must be a zoom.us or *.zoom.us URL with /j/ path");
  });

  it("マッピング未指定ならエラー", async () => {
    await expect(() =>
      buildImportZoomSettingsUrl({
        baseUrl: "https://example.github.io/nlp2026/",
        venues: [],
        sessions: [],
        presentations: [],
        help: false,
      }),
    ).rejects.toThrow("At least one of --venue, --session or --presentation is required");
  });

  it("pnpm run 経由の '--' を無視して引数を解釈できる", () => {
    const parsed = parseArgs([
      "--",
      "--base-url",
      "https://example.github.io/nlp2026/",
      "--venue",
      "A=https://zoom.us/j/111?pwd=aaa",
      "--session",
      "B1=https://zoom.us/j/222?pwd=bbb",
    ]);
    expect(parsed).toEqual({
      baseUrl: "https://example.github.io/nlp2026/",
      venues: ["A=https://zoom.us/j/111?pwd=aaa"],
      sessions: ["B1=https://zoom.us/j/222?pwd=bbb"],
      presentations: [],
      help: false,
    });
  });
});
