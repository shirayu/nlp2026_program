/** @vitest-environment jsdom */

import { act, type ComponentProps, useState } from "react";
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

function normalizeClassName(className: string): string {
  return className
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .sort()
    .join(" ");
}

type RoomChipSnapshotCase = {
  selectedTime: string | null;
  isActive: boolean;
  isSelected: boolean;
  hasNoPresentation: boolean;
  filtersDisabled: boolean;
};

function buildRoomChipSnapshotCases(): RoomChipSnapshotCase[] {
  const bools = [false, true] as const;
  return bools.flatMap((hasSelectedTime) =>
    bools.flatMap((isActive) =>
      bools.flatMap((isSelected) =>
        bools.flatMap((hasNoPresentation) =>
          bools.map((filtersDisabled) => ({
            selectedTime: hasSelectedTime ? "9:00" : null,
            isActive,
            isSelected,
            hasNoPresentation,
            filtersDisabled,
          })),
        ),
      ),
    ),
  );
}

function renderRoomChipClassName(testCase: RoomChipSnapshotCase): string {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const room = "A";

  act(() => {
    root.render(
      <ProgramHeader
        {...baseHeaderProps()}
        rooms={[room]}
        activeRooms={testCase.isActive ? [room] : []}
        selectedRoom={testCase.isSelected ? room : null}
        selectedTime={testCase.selectedTime}
        roomHasPresentationsOnSelectedDate={testCase.hasNoPresentation ? { [room]: false } : { [room]: true }}
        filtersDisabled={testCase.filtersDisabled}
      />,
    );
  });

  const targetButton = findButtonByText(container, room);
  const className = normalizeClassName(targetButton.className);

  act(() => {
    root.unmount();
  });
  container.remove();

  return className;
}

type HeaderProps = ComponentProps<typeof ProgramHeader>;

function baseHeaderProps(): HeaderProps {
  return {
    query: "",
    isSearching: false,
    searchAll: false,
    bookmarkCount: 0,
    bookmarkFilterActive: false,
    showSettings: false,
    showInstallButton: false,
    showInstallDialog: false,
    slackUrl: null,
    slackAppUrl: null,
    useSlackAppLinks: false,
    allDates: ["2026-03-09"],
    filtersDisabled: false,
    selectedDate: "2026-03-09",
    showFilters: true,
    allTimes: ["9:00", "9:05"],
    timelineSegments: [true],
    selectedTime: null,
    nowEnabled: false,
    rooms: ["A", "B"],
    showRoomFloorLabels: true,
    roomHasPresentationsOnSelectedDate: undefined,
    activeRooms: ["A", "B"],
    selectedRoom: null,
    onQueryCommit: () => {},
    onToggleSearchAll: () => {},
    onToggleBookmarkFilter: () => {},
    onOpenSettings: () => {},
    onOpenInstallDialog: () => {},
    onSelectDate: () => {},
    onToggleFilters: () => {},
    onSelectTime: () => {},
    onSelectNow: () => {},
    onSelectRoom: () => {},
  };
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
    expect(roomB.className).toContain("border-amber-400 bg-amber-50 text-amber-800");

    act(() => {
      roomB.click();
    });

    const roomBAfterClick = findButtonByText(container, "B");
    expect(onSelectRoomSpy).toHaveBeenCalledWith("B");
    expect(roomBAfterClick.className).toContain("border-amber-400 bg-amber-600 text-white");

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("B/C会場ボタンを薄い灰色のグループで囲む", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ProgramHeader {...baseHeaderProps()} rooms={["A", "B", "C", "P"]} />);
    });

    const roomB = findButtonByText(container, "B");
    const roomC = findButtonByText(container, "C");
    const buttonRow = roomB.parentElement;
    const group = buttonRow?.parentElement?.parentElement;

    expect(group).not.toBeNull();
    expect(buttonRow).toBe(roomC.parentElement);
    expect(buttonRow?.className).toContain("flex");
    expect(group?.textContent).toContain("2F");
    expect(group?.querySelector('[aria-hidden="true"]')?.className).toContain("bg-gray-200");
    expect(roomB.className).toContain("border");
    expect(roomC.className).toContain("border");

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("階数表示設定オフのとき 2F ラベルを表示しない", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ProgramHeader {...baseHeaderProps()} rooms={["A", "B", "C", "P"]} showRoomFloorLabels={false} />);
    });

    expect(container.textContent).not.toContain("2F");
    expect(container.querySelector(".rounded-full.bg-gray-200")).toBeNull();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("複数会場が同時にアクティブな発表なし状態でも選択中会場は会場色を維持する", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ProgramHeader
          {...baseHeaderProps()}
          selectedTime="9:00"
          rooms={["A", "B"]}
          activeRooms={["A", "B"]}
          selectedRoom="A"
          roomHasPresentationsOnSelectedDate={{ A: false, B: false }}
        />,
      );
    });

    const roomA = findButtonByText(container, "A");
    expect(roomA.className).toContain("border-rose-400 bg-rose-600 text-white");
    expect(roomA.className).not.toContain("bg-slate-500 text-white");

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("同一入力で会場ボタンのクラスが一意に決まる（テーブルドリブン）", () => {
    const cases: Array<{
      name: string;
      props: Partial<HeaderProps>;
      targetRoom: string;
      expected: string;
      unexpected: string[];
    }> = [
      {
        name: "disabled",
        props: { filtersDisabled: true, selectedRoom: "B" },
        targetRoom: "B",
        expected: "cursor-not-allowed bg-gray-200 text-gray-400 border-gray-300",
        unexpected: ["bg-slate-500 text-white", "bg-amber-600 text-white"],
      },
      {
        name: "out_of_scope_unselected",
        props: {
          selectedDate: "2026-03-11",
          selectedTime: "15:00",
          rooms: ["P", "C"],
          activeRooms: ["P"],
          roomHasPresentationsOnSelectedDate: { P: false, C: true },
          selectedRoom: null,
        },
        targetRoom: "C",
        expected: "border-slate-300 bg-slate-100 text-slate-600",
        unexpected: ["bg-emerald-50 text-emerald-800", "bg-emerald-600 text-white"],
      },
      {
        name: "out_of_scope_selected",
        props: {
          selectedDate: "2026-03-11",
          selectedTime: "15:00",
          rooms: ["P", "C"],
          activeRooms: ["P"],
          roomHasPresentationsOnSelectedDate: { P: false },
          selectedRoom: "C",
        },
        targetRoom: "C",
        expected: "border-slate-300 bg-slate-500 text-white",
        unexpected: ["bg-emerald-600 text-white", "bg-slate-100 text-slate-600"],
      },
      {
        name: "no_presentation_unselected",
        props: {
          selectedTime: null,
          roomHasPresentationsOnSelectedDate: { A: true, B: false },
          selectedRoom: null,
        },
        targetRoom: "B",
        expected: "border-amber-400 bg-amber-50 text-amber-800",
        unexpected: ["bg-slate-100 text-slate-600", "bg-slate-500 text-white"],
      },
      {
        name: "no_presentation_selected",
        props: {
          selectedTime: null,
          roomHasPresentationsOnSelectedDate: { A: true, B: false },
          selectedRoom: "B",
        },
        targetRoom: "B",
        expected: "border-amber-400 bg-amber-600 text-white",
        unexpected: ["bg-slate-500 text-white", "bg-slate-100 text-slate-600"],
      },
      {
        name: "selected",
        props: { selectedRoom: "A" },
        targetRoom: "A",
        expected: "border-rose-400 bg-rose-600 text-white",
        unexpected: ["bg-slate-500 text-white", "bg-rose-50 text-rose-800"],
      },
      {
        name: "active",
        props: { selectedRoom: null, activeRooms: ["A"] },
        targetRoom: "A",
        expected: "border-rose-400 bg-rose-50 text-rose-800",
        unexpected: ["bg-rose-600 text-white", "bg-slate-100 text-slate-600"],
      },
      {
        name: "inactive",
        props: { selectedRoom: null, activeRooms: ["A"] },
        targetRoom: "B",
        expected: "border-amber-400 bg-amber-50/70 text-amber-700",
        unexpected: ["bg-slate-100 text-slate-600", "bg-amber-600 text-white"],
      },
    ];

    for (const testCase of cases) {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);

      act(() => {
        root.render(<ProgramHeader {...baseHeaderProps()} {...testCase.props} />);
      });

      const targetButton = findButtonByText(container, testCase.targetRoom);
      expect(targetButton.className, testCase.name).toContain(testCase.expected);
      for (const bad of testCase.unexpected) {
        expect(targetButton.className, `${testCase.name}: not ${bad}`).not.toContain(bad);
      }

      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("Q/M/未知会場の選択状態で会場ごとの枠線・塗り色を適用する", () => {
    const cases: Array<{ room: string; expected: string }> = [
      { room: "Q", expected: "border-fuchsia-400 bg-fuchsia-600 text-white" },
      { room: "M", expected: "border-violet-400 bg-violet-600 text-white" },
      { room: "X", expected: "border-indigo-300 bg-indigo-600 text-white" },
    ];

    for (const testCase of cases) {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <ProgramHeader
            {...baseHeaderProps()}
            rooms={[testCase.room]}
            activeRooms={[testCase.room]}
            selectedRoom={testCase.room}
          />,
        );
      });

      const targetButton = findButtonByText(container, testCase.room);
      expect(targetButton.className, testCase.room).toContain(testCase.expected);

      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("全会場ボタンは selectedRoom と filtersDisabled に応じたクラスを適用する", () => {
    const enabledContainer = document.createElement("div");
    document.body.append(enabledContainer);
    const enabledRoot = createRoot(enabledContainer);

    act(() => {
      enabledRoot.render(<ProgramHeader {...baseHeaderProps()} selectedRoom={null} />);
    });

    const allRoomsEnabled = findButtonByText(enabledContainer, "全会場");
    expect(allRoomsEnabled.className).toContain("border-lime-300 bg-lime-200 text-lime-950");

    act(() => {
      enabledRoot.unmount();
    });
    enabledContainer.remove();

    const disabledContainer = document.createElement("div");
    document.body.append(disabledContainer);
    const disabledRoot = createRoot(disabledContainer);

    act(() => {
      disabledRoot.render(<ProgramHeader {...baseHeaderProps()} filtersDisabled selectedRoom={null} />);
    });

    const allRoomsDisabled = findButtonByText(disabledContainer, "全会場");
    expect(allRoomsDisabled.className).toContain("cursor-not-allowed bg-gray-200 text-gray-400 border-gray-300");

    act(() => {
      disabledRoot.unmount();
    });
    disabledContainer.remove();
  });

  it("会場ボタンの組み合わせクラスをスナップショット固定する（正規化済み）", () => {
    const rows = buildRoomChipSnapshotCases().map((testCase) => ({
      ...testCase,
      className: renderRoomChipClassName(testCase),
    }));

    expect(rows).toMatchInlineSnapshot(`
      [
        {
          "className": "bg-rose-50/70 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-rose-700 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-rose-50/70 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-rose-700 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-rose-600 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-rose-600 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-rose-50 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-rose-800 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-rose-50 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-rose-800 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": false,
          "selectedTime": null,
        },
        {
          "className": "bg-rose-600 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-rose-600 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": true,
          "selectedTime": null,
        },
        {
          "className": "bg-slate-100 border border-slate-300 font-medium px-3 py-1 rounded-full shrink-0 text-slate-600 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-slate-100 border border-slate-300 font-medium px-3 py-1 rounded-full shrink-0 text-slate-600 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-slate-500 border border-slate-300 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": true,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": false,
          "isSelected": true,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-slate-500 border border-slate-300 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": true,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": false,
          "isSelected": true,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-rose-50 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-rose-800 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-rose-50 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-rose-800 text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": false,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-rose-600 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": true,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": false,
          "isActive": true,
          "isSelected": true,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-rose-600 border border-rose-400 font-medium px-3 py-1 rounded-full shrink-0 text-white text-xs",
          "filtersDisabled": false,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": true,
          "selectedTime": "9:00",
        },
        {
          "className": "bg-gray-200 border border-gray-300 cursor-not-allowed font-medium px-3 py-1 rounded-full shrink-0 text-gray-400 text-xs",
          "filtersDisabled": true,
          "hasNoPresentation": true,
          "isActive": true,
          "isSelected": true,
          "selectedTime": "9:00",
        },
      ]
    `);
  });
});
