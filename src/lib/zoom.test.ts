import { describe, expect, it } from "vitest";
import type { ConferenceData } from "../types";
import { resolvePresentationZoomUrl, resolveSessionZoomUrl } from "./zoom";

const data: ConferenceData = {
  persons: {},
  affiliations: {},
  rooms: {
    rA: { name: "A会場" },
    rP: { name: "P会場" },
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
      zoom_url: "https://example.com/default-session-a",
    },
    sP: {
      title: "P",
      date: "2026-03-09",
      start_time: "10:00",
      end_time: "11:00",
      room_ids: ["rP"],
      chair: "",
      presentation_ids: ["pP"],
      zoom_url: null,
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
      zoom_url: "https://example.com/default-presentation-a",
    },
    pP: {
      title: "pP",
      session_id: "sP",
      presenter_id: null,
      is_english: false,
      is_online: true,
      authors: [],
      pdf_url: null,
      zoom_url: null,
    },
  },
};

describe("resolveSessionZoomUrl", () => {
  it("session custom > venue custom > session.zoom_url の順で解決する", () => {
    const resolved = resolveSessionZoomUrl("sA", data.sessions.sA, data.rooms, {
      venues: { A: "https://zoom.us/j/100?pwd=venue" },
      sessions: { sA: "https://zoom.us/j/101?pwd=session" },
    });

    expect(resolved).toBe("https://zoom.us/j/101?pwd=session");
  });

  it("session.zoom_url が null でも custom があれば表示する", () => {
    const resolved = resolveSessionZoomUrl("sP", data.sessions.sP, data.rooms, {
      venues: { P: "https://zoom.us/j/102?pwd=venue" },
    });
    expect(resolved).toBe("https://zoom.us/j/102?pwd=venue");
  });
});

describe("resolvePresentationZoomUrl", () => {
  it("presentation > session > venue > presentation.zoom_url > session.zoom_url の順で解決する", () => {
    const resolved = resolvePresentationZoomUrl("pA", data.presentations.pA, data, {
      venues: { A: "https://zoom.us/j/100?pwd=venue" },
      sessions: { sA: "https://zoom.us/j/101?pwd=session" },
      presentations: { pA: "https://zoom.us/j/102?pwd=presentation" },
    });

    expect(resolved).toBe("https://zoom.us/j/102?pwd=presentation");
  });

  it("presentation custom は session card の解決に影響しない", () => {
    const sessionResolved = resolveSessionZoomUrl("sA", data.sessions.sA, data.rooms, {
      sessions: { sA: "https://zoom.us/j/101?pwd=session" },
      presentations: { pA: "https://zoom.us/j/102?pwd=presentation" },
    });
    expect(sessionResolved).toBe("https://zoom.us/j/101?pwd=session");
  });

  it("presentation/session が null でも custom があれば表示する", () => {
    const resolved = resolvePresentationZoomUrl("pP", data.presentations.pP, data, {
      sessions: { sP: "https://zoom.us/j/103?pwd=session" },
    });
    expect(resolved).toBe("https://zoom.us/j/103?pwd=session");
  });
});
