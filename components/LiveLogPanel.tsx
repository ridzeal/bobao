"use client";

/**
 * LiveLogPanel
 * ─────────────
 * Client component that streams logs via SSE from /api/sessions/[id]/stream.
 * Renders the same LogPanel UI but with live updates, plus a follow-up input
 * that becomes enabled once the run finishes (`done`).
 */

import { useLiveStream } from "./useLiveStream";
import { LogPanel } from "./LogPanel";
import { InputForm } from "./InputForm";

export function LiveLogPanel({
  sessionId,
  onSend,
}: {
  sessionId: string;
  onSend?: (sessionId: string, text: string) => Promise<void>;
}) {
  const { lines, done, reconnect } = useLiveStream(sessionId);

  return (
    <div className="flex flex-col h-full">
      <LogPanel lines={lines} />
      {done && lines.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-txt-dim font-mono">No output yet.</p>
        </div>
      )}
      {onSend && (
        <div className="shrink-0 border-t border-bg-border bg-bg-elevated px-3 py-2">
          {done ? (
            <InputForm sessionId={sessionId} onSend={onSend} onSent={reconnect} />
          ) : (
            <p className="text-xs font-mono text-txt-dim">Agent working — follow-up available when the run finishes…</p>
          )}
        </div>
      )}
    </div>
  );
}
