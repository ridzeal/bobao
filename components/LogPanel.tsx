"use client";

import { LogLine } from "@/lib/session-provider";
import { useEffect, useRef, useState } from "react";

const LEVEL_COLOR: Record<string, string> = {
  info:   "text-txt-muted",
  warn:   "text-yellow",
  error:  "text-red",
  prompt: "text-green font-medium",
};

function formatTs(d: Date) {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LogPanel({ lines }: { lines: LogLine[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, autoScroll]);

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border bg-bg-elevated shrink-0">
        <span className="text-xs font-mono text-txt-dim uppercase tracking-wide">
          stdout · {lines.length} lines
        </span>
        <label className="flex items-center gap-1.5 text-xs text-txt-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="accent-green"
          />
          auto-scroll
        </label>
      </div>
      {/* log body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-5">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3 hover:bg-bg-elevated/40 px-1 -mx-1 rounded">
            <span className="text-txt-dim shrink-0 w-20 text-right">{formatTs(line.ts)}</span>
            <span className={LEVEL_COLOR[line.level ?? "info"] ?? "text-txt"}>
              {line.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
