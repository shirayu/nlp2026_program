import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadConferenceDataCache,
  loadSlackChannelsCache,
  saveConferenceDataCache,
  saveSlackChannelsCache,
} from "../lib/offlineCache";
import { fetchConferenceData, fetchSessionSlackChannels } from "../services/conferenceService";
import type { ConferenceData, SessionId, SlackChannelRef } from "../types";

export type DataReloadStatus = "idle" | "updated" | "no_change" | "error";
export type InitialLoadStatus = "loading" | "ready" | "error";
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
  const [initialLoadStatus, setInitialLoadStatus] = useState<InitialLoadStatus>("loading");
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
      const previousData = previousDataRef.current;
      const previousSlackChannels = previousSlackChannelsRef.current;
      const conferenceData = await fetchConferenceData();
      saveConferenceDataCache(conferenceData);
      let slackChannels = previousSlackChannels;
      try {
        slackChannels = await fetchSessionSlackChannels();
        saveSlackChannelsCache(slackChannels);
      } catch {
        const cachedSlackChannels = loadSlackChannelsCache();
        if (cachedSlackChannels !== null) {
          slackChannels = cachedSlackChannels;
        }
      }
      const hasDataChanged =
        JSON.stringify(conferenceData) !== JSON.stringify(previousData) ||
        JSON.stringify(slackChannels) !== JSON.stringify(previousSlackChannels);
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

  const loadInitialData = useCallback(async () => {
    setInitialLoadStatus("loading");
    let resolvedData: ConferenceData | null = null;
    let resolvedSlackChannels: Partial<Record<SessionId, SlackChannelRef>> = {};

    try {
      resolvedData = await fetchConferenceData();
      saveConferenceDataCache(resolvedData);
    } catch {
      resolvedData = loadConferenceDataCache();
    }

    try {
      resolvedSlackChannels = await fetchSessionSlackChannels();
      saveSlackChannelsCache(resolvedSlackChannels);
    } catch {
      resolvedSlackChannels = loadSlackChannelsCache() ?? {};
    }

    if (resolvedData === null) {
      setData(null);
      setSessionSlackChannels(resolvedSlackChannels);
      previousSlackChannelsRef.current = resolvedSlackChannels;
      setInitialLoadStatus("error");
      return;
    }

    setData(resolvedData);
    setSessionSlackChannels(resolvedSlackChannels);
    previousDataRef.current = resolvedData;
    previousSlackChannelsRef.current = resolvedSlackChannels;
    setInitialLoadStatus("ready");
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(
    () => () => {
      if (statusResetTimerRef.current !== null) {
        globalThis.clearTimeout(statusResetTimerRef.current);
      }
    },
    [],
  );

  return {
    data,
    sessionSlackChannels,
    isReloading,
    reloadStatus,
    reload,
    initialLoadStatus,
    retryInitialLoad: loadInitialData,
  };
}
