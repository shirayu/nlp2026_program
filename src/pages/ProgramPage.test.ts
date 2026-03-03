import { describe, expect, it } from "vitest";
import { fullscreenDialogClassName } from "./ProgramPage";

describe("fullscreenDialogClassName", () => {
  it("設定ダイアログが最前面に出る z-index を含む", () => {
    expect(fullscreenDialogClassName).toContain("z-50");
  });
});
