import { describe, expect, it, vi } from "vitest";
import { RELOAD_STATUS_AUTO_HIDE_MS, scheduleReloadStatusReset } from "./useConferenceData";

describe("scheduleReloadStatusReset", () => {
  it("一定時間後に reloadStatus を idle に戻す", () => {
    vi.useFakeTimers();
    const timerRef: { current: ReturnType<typeof globalThis.setTimeout> | null } = { current: null };
    const setReloadStatus = vi.fn();

    scheduleReloadStatusReset(timerRef, setReloadStatus);
    expect(setReloadStatus).not.toHaveBeenCalled();

    vi.advanceTimersByTime(RELOAD_STATUS_AUTO_HIDE_MS - 1);
    expect(setReloadStatus).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(setReloadStatus).toHaveBeenCalledWith("idle");
    expect(timerRef.current).toBeNull();

    vi.useRealTimers();
  });

  it("新しいタイマーをセットすると前のタイマーを打ち消す", () => {
    vi.useFakeTimers();
    const timerRef: { current: ReturnType<typeof globalThis.setTimeout> | null } = { current: null };
    const setReloadStatus = vi.fn();

    scheduleReloadStatusReset(timerRef, setReloadStatus);
    vi.advanceTimersByTime(RELOAD_STATUS_AUTO_HIDE_MS - 100);
    scheduleReloadStatusReset(timerRef, setReloadStatus);
    vi.advanceTimersByTime(99);
    expect(setReloadStatus).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(setReloadStatus).not.toHaveBeenCalled();
    vi.advanceTimersByTime(RELOAD_STATUS_AUTO_HIDE_MS);
    expect(setReloadStatus).toHaveBeenCalledTimes(1);
    expect(setReloadStatus).toHaveBeenCalledWith("idle");

    vi.useRealTimers();
  });
});
