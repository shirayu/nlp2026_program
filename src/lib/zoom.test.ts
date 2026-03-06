import { describe, expect, it } from "vitest";
import type { ConferenceData } from "../types";
import { resolvePresentationZoomUrl, resolveSessionZoomUrl } from "./zoom";

const data: ConferenceData = {
  persons: {},
  affiliations: {},
  rooms: {
    rA: { name: "A会場" },
    rB: { name: "B会場" },
    rC: { name: "C会場" },
  },
  sessions: {
    sA: {
      title: "A",
      date: "2026-03-09",
      start_time: "09:00",
      end_time: "10:00",
      room_ids: ["rA"],
      chair: "",
      presentation_ids: ["pA"],
      zoom_url: "https://example.com/default-a",
    },
    sC: {
      title: "C",
      date: "2026-03-09",
      start_time: "10:00",
      end_time: "11:00",
      room_ids: ["rC"],
      chair: "",
      presentation_ids: ["pC"],
      zoom_url: "https://example.com/default-c",
    },
  },
  presentations: {
    pA: {
      title: "pA",
      session_id: "sA",
      presenter_id: null,
      is_english: false,
      is_online: true,
      authors: [],
      pdf_url: null,
      zoom_url: "https://example.com/presentation-a",
    },
    pC: {
      title: "pC",
      session_id: "sC",
      presenter_id: null,
      is_english: false,
      is_online: true,
      authors: [],
      pdf_url: null,
      zoom_url: "https://example.com/presentation-c",
    },
  },
};

describe("resolveSessionZoomUrl", () => {
  it("A/B会場にカスタムURLがあれば session zoom_url より優先する", () => {
    const resolved = resolveSessionZoomUrl(data.sessions.sA, data.rooms, data.sessions.sA.zoom_url ?? null, {
      A: "https://example.com/custom-a",
    });

    expect(resolved).toBe("https://example.com/custom-a");
  });

  it("A/B以外の会場は session zoom_url を使う", () => {
    const resolved = resolveSessionZoomUrl(data.sessions.sC, data.rooms, data.sessions.sC.zoom_url ?? null, {
      A: "https://example.com/custom-a",
      B: "https://example.com/custom-b",
    });

    expect(resolved).toBe("https://example.com/default-c");
  });

  it("session zoom_url がない場合はカスタムURLがあっても null を返す", () => {
    const resolved = resolveSessionZoomUrl(data.sessions.sA, data.rooms, null, {
      A: "https://example.com/custom-a",
    });

    expect(resolved).toBeNull();
  });
});

describe("resolvePresentationZoomUrl", () => {
  it("A/B会場にカスタムURLがあれば presentation zoom_url より優先する", () => {
    const resolved = resolvePresentationZoomUrl(data.presentations.pA, data, data.presentations.pA.zoom_url ?? null, {
      A: "https://example.com/custom-a",
    });

    expect(resolved).toBe("https://example.com/custom-a");
  });

  it("カスタムURLがない場合は presentation zoom_url を使う", () => {
    const resolved = resolvePresentationZoomUrl(data.presentations.pC, data, data.presentations.pC.zoom_url ?? null, {
      A: "https://example.com/custom-a",
    });

    expect(resolved).toBe("https://example.com/presentation-c");
  });

  it("presentation zoom_url がない場合はカスタムURLがあっても null を返す", () => {
    const resolved = resolvePresentationZoomUrl(data.presentations.pA, data, null, {
      A: "https://example.com/custom-a",
    });

    expect(resolved).toBeNull();
  });
});
