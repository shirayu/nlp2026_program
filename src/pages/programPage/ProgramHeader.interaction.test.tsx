/** @vitest-environment jsdom */

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramHeader } from "./ProgramHeader";

function findButtonByText(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === label,
  );
  if (!button) {
    throw new Error(`button not found: ${label}`);
  }
  return button as HTMLButtonElement;
}

describe("ProgramHeader room chip interaction", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("発表なし会場をクリックすると選択状態と表示色が切り替わる", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onSelectRoomSpy = vi.fn();

    function Harness() {
      const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
      return (
        <ProgramHeader
          query=""
          isSearching={false}
          searchAll={false}
          bookmarkCount={0}
          bookmarkFilterActive={false}
          showSettings={false}
          showInstallButton={false}
          showInstallDialog={false}
          slackUrl={null}
          slackAppUrl={null}
          useSlackAppLinks={false}
          allDates={["2026-03-09"]}
          filtersDisabled={false}
          selectedDate="2026-03-09"
          showFilters={true}
          allTimes={["9:00", "9:05"]}
          timelineSegments={[true]}
          selectedTime="9:00"
          nowEnabled={false}
          rooms={["A", "B"]}
          roomHasPresentationsOnSelectedDate={{ A: true, B: false }}
          activeRooms={["A", "B"]}
          selectedRoom={selectedRoom}
          onQueryCommit={() => {}}
          onToggleSearchAll={() => {}}
          onToggleBookmarkFilter={() => {}}
          onOpenSettings={() => {}}
          onOpenInstallDialog={() => {}}
          onSelectDate={() => {}}
          onToggleFilters={() => {}}
          onSelectTime={() => {}}
          onSelectNow={() => {}}
          onSelectRoom={(room) => {
            onSelectRoomSpy(room);
            setSelectedRoom(room);
          }}
        />
      );
    }

    act(() => {
      root.render(<Harness />);
    });

    const roomB = findButtonByText(container, "B");
    expect(roomB.className).toContain("bg-slate-100 text-slate-600");

    act(() => {
      roomB.click();
    });

    const roomBAfterClick = findButtonByText(container, "B");
    expect(onSelectRoomSpy).toHaveBeenCalledWith("B");
    expect(roomBAfterClick.className).toContain("bg-slate-500 text-white");

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
