/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimelineFilter } from "./TimelineFilter";

function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length;
}

describe("TimelineFilter", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("今ボタンは有効時でも強調色を使わない", () => {
    const html = renderToStaticMarkup(
      <TimelineFilter
        points={["9:00", "9:05", "9:10"]}
        activeSegments={[true, true]}
        selectedDate={null}
        selectedTime={null}
        onChange={vi.fn()}
        onSelectNow={vi.fn()}
        nowEnabled
      />,
    );

    expect(html).toContain("border-gray-300 bg-white text-gray-600");
    expect(html).not.toContain("border-amber-300");
    expect(html).not.toContain("bg-amber-50");
    expect(html).not.toContain("text-amber-700");
  });

  it("次の時点がないときは今ボタンを無効化して理由を表示する", () => {
    const html = renderToStaticMarkup(
      <TimelineFilter
        points={["9:00", "9:05", "9:10"]}
        activeSegments={[true, true]}
        selectedDate={null}
        selectedTime={null}
        onChange={vi.fn()}
        onSelectNow={vi.fn()}
        nowEnabled={false}
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('title="次の時点がないため利用できません"');
    expect(html).toContain("border-gray-200 bg-gray-100 text-gray-400");
  });

  it("当日の過去セグメントは緑の代わりに濃い灰色で表示する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 4, 10, 30, 0));

    const html = renderToStaticMarkup(
      <TimelineFilter
        points={["10:20", "10:25", "10:30", "10:35"]}
        activeSegments={[true, true, true]}
        selectedDate="2026-03-04"
        selectedTime="10:35"
        onChange={vi.fn()}
        onSelectNow={vi.fn()}
        nowEnabled
      />,
    );

    expect(countMatches(html, /bg-gray-600/g)).toBe(2);
    expect(countMatches(html, /bg-teal-200/g)).toBe(1);
  });

  it("過去日ではアクティブな全セグメントを濃い灰色にする", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 4, 10, 30, 0));

    const html = renderToStaticMarkup(
      <TimelineFilter
        points={["10:20", "10:25", "10:30", "10:35"]}
        activeSegments={[true, true, true]}
        selectedDate="2026-03-03"
        selectedTime="10:35"
        onChange={vi.fn()}
        onSelectNow={vi.fn()}
        nowEnabled
      />,
    );

    expect(countMatches(html, /bg-gray-600/g)).toBe(3);
    expect(html).not.toContain("bg-teal-200");
  });

  it("未来日ではアクティブなセグメントを濃い灰色にしない", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 4, 10, 30, 0));

    const html = renderToStaticMarkup(
      <TimelineFilter
        points={["10:20", "10:25", "10:30", "10:35"]}
        activeSegments={[true, true, true]}
        selectedDate="2026-03-05"
        selectedTime="10:35"
        onChange={vi.fn()}
        onSelectNow={vi.fn()}
        nowEnabled
      />,
    );

    expect(html).not.toContain("bg-gray-600");
    expect(countMatches(html, /bg-teal-200/g)).toBe(3);
  });

  it("ドラッグ中は onChange を確定せず、pointerup で1回だけ確定する", () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <TimelineFilter
          points={["9:00", "9:05", "9:10"]}
          activeSegments={[true, true]}
          selectedDate="2026-03-04"
          selectedTime="9:00"
          onChange={onChange}
          onSelectNow={vi.fn()}
          nowEnabled
        />,
      );
    });

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;

    act(() => {
      slider.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      slider.value = "2";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      slider.dispatchEvent(new Event("pointerup", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("9:10");

    act(() => {
      root.unmount();
    });
  });

  it("selectedTime プロップ更新時はドラフト値を同期する", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <TimelineFilter
          points={["9:00", "9:05", "9:10"]}
          activeSegments={[true, true]}
          selectedDate="2026-03-04"
          selectedTime="9:05"
          onChange={vi.fn()}
          onSelectNow={vi.fn()}
          nowEnabled
        />,
      );
    });

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;

    act(() => {
      slider.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      slider.value = "2";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });

    act(() => {
      root.render(
        <TimelineFilter
          points={["9:00", "9:05", "9:10"]}
          activeSegments={[true, true]}
          selectedDate="2026-03-04"
          selectedTime="9:05"
          onChange={vi.fn()}
          onSelectNow={vi.fn()}
          nowEnabled
        />,
      );
    });

    expect(slider.value).toBe("1");

    act(() => {
      root.unmount();
    });
  });

  it("非ドラッグ時の change は即時に onChange を確定する", () => {
    const onChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <TimelineFilter
          points={["9:00", "9:05", "9:10"]}
          activeSegments={[true, true]}
          selectedDate="2026-03-04"
          selectedTime="9:00"
          onChange={onChange}
          onSelectNow={vi.fn()}
          nowEnabled
        />,
      );
    });

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    const setNativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    expect(setNativeValue).toBeTypeOf("function");

    act(() => {
      setNativeValue?.call(slider, "1");
      slider.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith("9:05");

    act(() => {
      root.unmount();
    });
  });
});
