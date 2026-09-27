"use client";

import { useState, useTransition } from "react";

export function InputForm({
  sessionId,
  onSend,
  onSent,
}: {
  sessionId: string;
  onSend: (sessionId: string, text: string) => Promise<void>;
  /** Called after a successful send (e.g. to reconnect the log stream). */
  onSent?: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await onSend(sessionId, trimmed);
        setText("");
        onSent?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a follow-up…"
          className="flex-1 bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="px-4 py-2 bg-green/10 border border-green/30 text-green text-sm font-medium rounded-lg hover:bg-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Sending…" : "Send"}
        </button>
      </form>
      {error && (
        <p className="mt-1.5 text-xs font-mono text-red">{error}</p>
      )}
    </div>
  );
}
