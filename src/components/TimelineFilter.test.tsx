import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TimelineFilter } from "./TimelineFilter";

describe("TimelineFilter", () => {
  it("今ボタンは有効時でも強調色を使わない", () => {
    const html = renderToStaticMarkup(
      <TimelineFilter
        points={["9:00", "9:05", "9:10"]}
        activeSegments={[true, true]}
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
});
