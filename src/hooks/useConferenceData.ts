import { useCallback, useEffect, useRef, useState } from "react";
import { fetchConferenceData, fetchSessionSlackChannels } from "../services/conferenceService";
import type { ConferenceData, SessionId, SlackChannelRef } from "../types";

export type DataReloadStatus = "idle" | "updated" | "no_change" | "error";
export const RELOAD_STATUS_AUTO_HIDE_MS = 3000;

export function scheduleReloadStatusReset(
  timerRef: { current: ReturnType<typeof globalThis.setTimeout> | null },
  setReloadStatus: (status: DataReloadStatus) => void,
) {
  if (timerRef.current !== null) {
    globalThis.clearTimeout(timerRef.current);
  }
  timerRef.current = globalThis.setTimeout(() => {
    setReloadStatus("idle");
    timerRef.current = null;
  }, RELOAD_STATUS_AUTO_HIDE_MS);
}

export function useConferenceData() {
  const [data, setData] = useState<ConferenceData | null>(null);
  const [sessionSlackChannels, setSessionSlackChannels] = useState<Partial<Record<SessionId, SlackChannelRef>>>({});
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<DataReloadStatus>("idle");
  const previousDataRef = useRef<ConferenceData | null>(null);
  const previousSlackChannelsRef = useRef<Partial<Record<SessionId, SlackChannelRef>>>({});
  const statusResetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const scheduleStatusReset = useCallback(() => {
    scheduleReloadStatusReset(statusResetTimerRef, setReloadStatus);
  }, []);

  const reload = useCallback(async () => {
    setIsReloading(true);
    setReloadStatus("idle");
    try {
      const [conferenceData, slackChannels] = await Promise.all([fetchConferenceData(), fetchSessionSlackChannels()]);
      const hasDataChanged =
        JSON.stringify(conferenceData) !== JSON.stringify(previousDataRef.current) ||
        JSON.stringify(slackChannels) !== JSON.stringify(previousSlackChannelsRef.current);
      setData(conferenceData);
      setSessionSlackChannels(slackChannels);
      previousDataRef.current = conferenceData;
      previousSlackChannelsRef.current = slackChannels;
      if (hasDataChanged) {
        setReloadStatus("updated");
      } else {
        setReloadStatus("no_change");
        scheduleStatusReset();
      }
    } catch (error) {
      setReloadStatus("error");
      scheduleStatusReset();
      throw error;
    } finally {
      setIsReloading(false);
    }
  }, [scheduleStatusReset]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () => () => {
      if (statusResetTimerRef.current !== null) {
        globalThis.clearTimeout(statusResetTimerRef.current);
      }
    },
    [],
  );

  return { data, sessionSlackChannels, isReloading, reloadStatus, reload };
}
