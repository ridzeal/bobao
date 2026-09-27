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
 *  • Cleans up on component unmount.
 */

import { useEffect, useState } from "react";
import { LogLine } from "@/lib/session-provider";

export function useLiveStream(sessionId: string): {
  lines: LogLine[];
  done: boolean;
} {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);

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
      es.close();
    };

    return () => {
      es.close();
    };
  }, [sessionId]);

  return { lines, done };
}
