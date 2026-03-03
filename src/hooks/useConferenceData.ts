import { useEffect, useState } from "react";
import { fetchConferenceData } from "../services/conferenceService";
import type { ConferenceData } from "../types";

export function useConferenceData() {
  const [data, setData] = useState<ConferenceData | null>(null);
  useEffect(() => {
    fetchConferenceData().then(setData);
  }, []);
  return data;
}
