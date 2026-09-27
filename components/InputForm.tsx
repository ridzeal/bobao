"use client";

import { useState, useTransition } from "react";

export function InputForm({
  sessionId,
  onSend,
}: {
  sessionId: string;
  onSend: (sessionId: string, text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await onSend(sessionId, trimmed);
      setSent(true);
      setText("");
    });
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-green font-mono px-4 py-3 bg-green-dim rounded-lg border border-green/20">
        <span>✓</span>
        <span>Input sent. Waiting for agent to resume…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your response… (e.g. A, or describe an approach)"
        className="flex-1 bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-yellow/50 focus:border-yellow/50 transition-colors"
        disabled={isPending}
        autoFocus
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="px-4 py-2 bg-yellow/10 border border-yellow/30 text-yellow text-sm font-medium rounded-lg hover:bg-yellow/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
