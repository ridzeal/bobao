"use client";

/**
 * useLiveStream
 * ─────────────
 * Subscribes to GET /api/sessions/[id]/stream (SSE endpoint).
 * Returns the accumulated array of LogLine objects.
 *
 * Behaviour:
 *  • Immediately starts streaming buffered + live lines.
 *  • Closes the EventSource when the server sends `event: done`.
 *  • `reconnect()` restarts the stream from scratch (used after a follow-up
 *    spawns a resume run — the server replays its full buffer on connect).
 *  • Cleans up on component unmount.
 */

import { useCallback, useEffect, useState } from "react";
import { LogLine } from "@/lib/session-provider";

export function useLiveStream(sessionId: string): {
  lines: LogLine[];
  done: boolean;
  reconnect: () => void;
} {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const url = `/api/sessions/${sessionId}/stream`;
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data) as { ts: string; text: string; level?: LogLine["level"] };
        const line: LogLine = { ...raw, ts: new Date(raw.ts) };
        setLines((prev) => [...prev, line]);
      } catch {
        // Ignore malformed events
      }
    };

    es.addEventListener("done", () => {
      setDone(true);
      es.close();
    });

    es.onerror = () => {
      // Stream died — treat as finished so the follow-up input stays usable.
      // The server rejects sends with "Agent is still running" if it isn't.
      es.close();
      setDone(true);
    };

    return () => {
      es.close();
    };
  }, [sessionId, epoch]);

  const reconnect = useCallback(() => {
    // Server replays its full buffer on connect — start clean to avoid dupes
    setLines([]);
    setDone(false);
    setEpoch((e) => e + 1);
  }, []);

  return { lines, done, reconnect };
}
