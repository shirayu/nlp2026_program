import { useEffect, useState } from "react";
import { fetchConferenceData, fetchSessionSlackChannels } from "../services/conferenceService";
import type { ConferenceData, SessionId, SlackChannelRef } from "../types";

export function useConferenceData() {
  const [data, setData] = useState<ConferenceData | null>(null);
  const [sessionSlackChannels, setSessionSlackChannels] = useState<Partial<Record<SessionId, SlackChannelRef>>>({});

  useEffect(() => {
    Promise.all([fetchConferenceData(), fetchSessionSlackChannels()]).then(([conferenceData, slackChannels]) => {
      setData(conferenceData);
      setSessionSlackChannels(slackChannels);
    });
  }, []);

  return { data, sessionSlackChannels };
}
