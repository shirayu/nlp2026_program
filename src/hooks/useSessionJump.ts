import { useEffect, useRef, useState } from "react";
import type { SessionId } from "../types";

export function useSessionJump() {
  const [jumpSession, setJumpSession] = useState<SessionId | null>(null);
  const sessionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!jumpSession) return;
    const el = sessionRefs.current[jumpSession];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setJumpSession(null);
    }
  }, [jumpSession]);

  return { jumpSession, setJumpSession, sessionRefs };
}
