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
    WS1: {
      title: "Workshop Parent",
      date: "2026-03-09",
      start_time: "08:00",
      end_time: "12:00",
      room_ids: ["rA"],
      chair: "",
      presentation_ids: [],
      zoom_url: null,
    },
    "WS1-1": {
      title: "Workshop Child",
      date: "2026-03-09",
      start_time: "09:00",
      end_time: "10:00",
      room_ids: ["rA"],
      chair: "",
      presentation_ids: ["pWS"],
      zoom_url: null,
    },
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
    pWS: {
      title: "pWS",
      session_id: "WS1-1",
      presenter_id: null,
      is_english: false,
      is_online: true,
      authors: [],
      pdf_url: null,
      zoom_url: null,
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
  it("session custom > venue custom > WS親custom > session.zoom_url の順で解決する", () => {
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

  it("WS子セッションは WS親の session custom URL を継承する", () => {
    const resolved = resolveSessionZoomUrl("WS1-1", data.sessions["WS1-1"], data.rooms, {
      sessions: { WS1: "https://zoom.us/j/150?pwd=workshop-parent" },
    });
    expect(resolved).toBe("https://zoom.us/j/150?pwd=workshop-parent");
  });

  it("WS子セッションで venue custom と WS親custom が両方ある場合は venue custom を優先する", () => {
    const resolved = resolveSessionZoomUrl("WS1-1", data.sessions["WS1-1"], data.rooms, {
      venues: { A: "https://zoom.us/j/152?pwd=venue" },
      sessions: { WS1: "https://zoom.us/j/150?pwd=workshop-parent" },
    });
    expect(resolved).toBe("https://zoom.us/j/152?pwd=venue");
  });
});

describe("resolvePresentationZoomUrl", () => {
  it("presentation > session > venue > WS親custom > presentation.zoom_url > session.zoom_url の順で解決する", () => {
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

  it("元データに Zoom がない発表では venue custom だけでは表示しない", () => {
    const resolved = resolvePresentationZoomUrl("pP", data.presentations.pP, data, {
      venues: { P: "https://zoom.us/j/104?pwd=venue" },
    });
    expect(resolved).toBeNull();
  });

  it("WS子セッション配下の発表は WS親の session custom URL を継承する", () => {
    const resolved = resolvePresentationZoomUrl("pWS", data.presentations.pWS, data, {
      sessions: { WS1: "https://zoom.us/j/151?pwd=workshop-parent" },
    });
    expect(resolved).toBe("https://zoom.us/j/151?pwd=workshop-parent");
  });

  it("WS子セッション配下の発表で元データに Zoom がない場合は venue custom より WS親custom を優先する", () => {
    const resolved = resolvePresentationZoomUrl("pWS", data.presentations.pWS, data, {
      venues: { A: "https://zoom.us/j/153?pwd=venue" },
      sessions: { WS1: "https://zoom.us/j/151?pwd=workshop-parent" },
    });
    expect(resolved).toBe("https://zoom.us/j/151?pwd=workshop-parent");
  });
});
