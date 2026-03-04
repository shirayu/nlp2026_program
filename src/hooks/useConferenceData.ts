import { useEffect, useState } from "react";
import { fetchConferenceData, fetchSessionSlackLinks } from "../services/conferenceService";
import type { ConferenceData } from "../types";

export function useConferenceData() {
  const [data, setData] = useState<ConferenceData | null>(null);
  const [sessionSlackLinks, setSessionSlackLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([fetchConferenceData(), fetchSessionSlackLinks()]).then(([conferenceData, slackLinks]) => {
      setData(conferenceData);
      setSessionSlackLinks(slackLinks);
    });
  }, []);

  return { data, sessionSlackLinks };
}
