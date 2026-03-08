/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProgramPage from "./ProgramPage";

const mockUseProgramPageState = vi.fn();

vi.mock("./programPage/useProgramPageState", () => ({
  useProgramPageState: () => mockUseProgramPageState(),
}));

vi.mock("./programPage/ProgramHeader", () => ({
  ProgramHeader: () => <div data-testid="header" />,
}));

vi.mock("./programPage/ProgramResults", () => ({
  ProgramResults: () => <div data-testid="results" />,
}));

vi.mock("./programPage/ProgramOverlays", () => ({
  ProgramOverlays: () => <div data-testid="overlays" />,
}));

function renderPage() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(<ProgramPage />);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("ProgramPage view states", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("initialLoadStatus=loading のとき読み込み中を表示する", () => {
    mockUseProgramPageState.mockReturnValue({
      data: null,
      initialLoadStatus: "loading",
      onRetryInitialLoad: vi.fn(),
      headerProps: {},
      resultsProps: {},
      overlayProps: {},
    });

    const page = renderPage();

    expect(page.container.textContent).toContain("読み込み中...");
    page.unmount();
  });

  it("initialLoadStatus=error のとき再試行UIを表示する", () => {
    const retry = vi.fn();
    mockUseProgramPageState.mockReturnValue({
      data: null,
      initialLoadStatus: "error",
      onRetryInitialLoad: retry,
      headerProps: {},
      resultsProps: {},
      overlayProps: {},
    });

    const page = renderPage();
    expect(page.container.textContent).toContain("データの読み込みに失敗しました");
    const button = page.container.querySelector("button");
    expect(button?.textContent).toContain("再試行");
    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(retry).toHaveBeenCalledTimes(1);
    page.unmount();
  });

  it("initialLoadStatus=ready のとき本体表示を描画する", () => {
    mockUseProgramPageState.mockReturnValue({
      data: { sessions: {}, rooms: {}, persons: {}, affiliations: {}, presentations: {} },
      initialLoadStatus: "ready",
      onRetryInitialLoad: vi.fn(),
      headerProps: {},
      resultsProps: {},
      overlayProps: {},
    });

    const page = renderPage();
    expect(page.container.querySelector(".bg-gray-50")).not.toBeNull();
    page.unmount();
  });
});
