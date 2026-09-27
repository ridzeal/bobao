"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DevServerControlsProps {
  projectId: string;
  devCommand?: string;
  onStart?: () => void;
  onStop?: () => void;
}

export function DevServerControls({
  projectId,
  devCommand,
  onStart,
  onStop,
}: DevServerControlsProps) {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/dev-server/${projectId}/status`);
      if (res.ok) {
        const data = await res.json();
        setRunning(data.running);
      }
    } catch {
      // ignore
    }
  }, [projectId]);

  const fetchLogs = useCallback(async () => {
    if (!running) return;
    try {
      const res = await fetch(`/api/dev-server/${projectId}/logs?lines=100`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch {
      // ignore
    }
  }, [projectId, running]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (!running || !showLogs) return;
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [running, showLogs, fetchLogs]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dev-server/${projectId}/start`, { method: "POST" });
      if (res.ok) {
        setRunning(true);
        setShowLogs(true);
        onStart?.();
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function handleStop() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dev-server/${projectId}/stop`, { method: "POST" });
      if (res.ok) {
        setRunning(false);
        setLogs("");
        onStop?.();
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  if (!devCommand) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-mono text-txt-dim truncate max-w-[180px]"
        title={devCommand}
      >
        {devCommand}
      </span>
      {running ? (
        <button
          onClick={handleStop}
          disabled={loading}
          className="px-2 py-1 text-xs font-mono text-red border border-red/30 rounded hover:bg-red/10 disabled:opacity-40 transition-colors"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={loading}
          className="px-2 py-1 text-xs font-mono text-green border border-green/30 rounded hover:bg-green/10 disabled:opacity-40 transition-colors"
        >
          Run
        </button>
      )}
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          running ? "bg-green animate-pulse" : "bg-txt-dim"
        }`}
      />
      {running && (
        <button
          onClick={() => setShowLogs((v) => !v)}
          className="text-xs text-txt-dim hover:text-txt transition-colors"
          title={showLogs ? "Hide logs" : "Show logs"}
        >
          {showLogs ? "▾" : "▸"} logs
        </button>
      )}
      {showLogs && (
        <div className="absolute top-full right-0 mt-1 w-[500px] max-h-[300px] bg-bg-base border border-bg-border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="px-3 py-1.5 border-b border-bg-border bg-bg-elevated flex items-center justify-between">
            <span className="text-xs font-mono text-txt-dim uppercase">Dev Server Output</span>
            <button
              onClick={() => setShowLogs(false)}
              className="text-xs text-txt-dim hover:text-txt"
            >
              ✕
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-txt-muted whitespace-pre-wrap break-all">
            {logs || <span className="text-txt-dim">No output yet…</span>}
            <div ref={logEndRef} />
          </pre>
        </div>
      )}
    </div>
  );
}
