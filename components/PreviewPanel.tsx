"use client";

import { useState } from "react";

export function PreviewPanel({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border bg-bg-elevated shrink-0">
        <span className="text-xs font-mono text-txt-dim truncate">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue hover:underline ml-2 shrink-0"
        >
          open ↗
        </a>
      </div>
      {failed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-txt-muted">
          <span className="text-3xl opacity-40">⧉</span>
          <p className="text-sm">Preview unreachable</p>
          <p className="text-xs text-txt-dim font-mono">{url}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue hover:underline"
          >
            Try opening in a new tab ↗
          </a>
        </div>
      ) : (
        <iframe
          src={url}
          className="flex-1 w-full border-0"
          title="App preview"
          onError={() => setFailed(true)}
          // cross-origin pages may silently fail; the load event doesn't fire on error
          onLoad={() => setFailed(false)}
        />
      )}
    </div>
  );
}

export function PreviewPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-txt-muted">
      <span className="text-3xl opacity-30">⧉</span>
      <p className="text-sm">No preview URL configured for this session</p>
    </div>
  );
}
