import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function loadData() {
  const dataPath = path.join(process.cwd(), "public", "data.json");
  return JSON.parse(readFileSync(dataPath, "utf8"));
}

describe("public/data.json presentation time fields", () => {
  it("発表の start_time/end_time は未設定時に null を保持する", () => {
    const data = loadData();
    const poster = data.presentations["B1-1"];
    const invited = data.presentations["invitedpapers-1"];

    expect(poster).toBeTruthy();
    expect(invited).toBeTruthy();
    expect(poster).toHaveProperty("start_time");
    expect(poster).toHaveProperty("end_time");
    expect(poster.start_time).toBeNull();
    expect(poster.end_time).toBeNull();
    expect(invited.start_time).toBeNull();
    expect(invited.end_time).toBeNull();
  });
});
