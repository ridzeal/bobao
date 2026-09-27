"use client";

/**
 * LiveLogPanel
 * ─────────────
 * Client component that streams logs via SSE from /api/sessions/[id]/stream.
 * Renders the same LogPanel UI but with live updates.
 */

import { useLiveStream } from "./useLiveStream";
import { LogPanel } from "./LogPanel";

export function LiveLogPanel({ sessionId }: { sessionId: string }) {
  const { lines, done } = useLiveStream(sessionId);

  return (
    <div className="flex flex-col h-full">
      <LogPanel lines={lines} />
      {done && lines.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-txt-dim font-mono">No output yet.</p>
        </div>
      )}
    </div>
  );
}
