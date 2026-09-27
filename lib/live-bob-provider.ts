/**
 * LiveBobProvider — a SessionProvider backed by a real spawned `bob` CLI process.
 *
 * Only the ONE session registered with `LIVE_SESSION_ID` is handled here.
 * Every other sessionId falls through to the caller (CompositeSessionProvider).
 *
 * Process lifecycle
 * ─────────────────
 * POST /api/sessions/[id]/spawn   → spawnBobProcess()   — creates the child
 * GET  /api/sessions/[id]/stream  → streamLogs()        — SSE fan-out
 * POST /api/sessions/[id]/input   → sendInput()         — writes to stdin
 */

import { spawn, execFile, ChildProcessWithoutNullStreams } from "child_process";
import { createInterface } from "readline";
import type { Session, SessionStatus, LogLine, Project } from "./types";
import { updateSessionStatus } from "./live-store";

// SessionProvider interface is defined in session-provider but we only need
// to satisfy it structurally — declare a minimal local version to avoid the
// circular import.
interface SessionProvider {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  listSessions(projectId: string): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  streamLogs(sessionId: string): AsyncIterable<LogLine>;
  sendInput(sessionId: string, text: string): Promise<void>;
}

// ─── Blocked-state heuristics ─────────────────────────────────────────────────
// A line matching ANY of these patterns flips the session to `blocked`.

export const BLOCKED_PATTERNS: RegExp[] = [
  /\?\s*$/,                           // ends with "? "
  /\(y\/n\)\s*$/i,                    // ends with "(y/n)"
  /waiting for/i,                     // "Waiting for …"
  /confirm/i,                         // "Confirm …"
  /do you want/i,                     // "Do you want …"
  /press enter/i,                     // "Press Enter to continue"
  /choose.*:/i,                       // "Choose an option:"
  /enter your/i,                      // "Enter your answer:"
];

// ─── Per-process state ────────────────────────────────────────────────────────

interface ProcessHandle {
  proc: ChildProcessWithoutNullStreams;
  session: Session;
  lines: LogLine[];
  /** SSE subscriber callbacks — called for every new line */
  subscribers: Set<(line: LogLine) => void>;
}

// Anchor handles to globalThis so Next.js hot-reload does not reset the map.
declare global {
  // eslint-disable-next-line no-var
  var __agentOpsHandles: Map<string, ProcessHandle> | undefined;
}
if (!globalThis.__agentOpsHandles) {
  globalThis.__agentOpsHandles = new Map();
}
const handles = globalThis.__agentOpsHandles;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyLine(text: string): LogLine["level"] {
  if (BLOCKED_PATTERNS.some((re) => re.test(text))) return "prompt";
  const lower = text.toLowerCase();
  if (lower.includes("error") || lower.includes("err:")) return "error";
  if (lower.includes("warn") || lower.includes("warning")) return "warn";
  return "info";
}

function pushLine(handle: ProcessHandle, text: string): void {
  const level = classifyLine(text);
  const line: LogLine = { ts: new Date(), text, level };
  handle.lines.push(line);

  // Flip to blocked when a prompt-level line appears and session is running
  if (level === "prompt" && handle.session.status === "running") {
    handle.session.status = "blocked";
    updateSessionStatus(handle.session.id, "blocked");
  }

  // Fan-out to SSE subscribers
  handle.subscribers.forEach((cb) => {
    try { cb(line); } catch { /* subscriber gone */ }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Spawn a `bob` child process for `sessionId`.
 * If a process already exists for this session it is killed first.
 *
 * Uses `bob run --format stream-json` for structured output.
 *
 * @param sessionId  - must match LIVE_SESSION_ID in the composite provider
 * @param args       - argv passed to `bob run` (e.g. ["--prompt", "...", "topic"])
 * @param cwd        - working directory for the child process
 * @param sessionMeta - Session metadata (title, projectId, …)
 */
export function spawnBobProcess(
  sessionId: string,
  args: string[],
  cwd: string,
  sessionMeta: Omit<Session, "id" | "status" | "startedAt">,
): void {
  // Kill previous handle if any
  const existing = handles.get(sessionId);
  if (existing) {
    try { existing.proc.kill(); } catch { /* ignore */ }
    handles.delete(sessionId);
  }

  // Use wrapper script to resolve bob in sandboxed Next.js context
  const wrapperPath = require("path").join(process.cwd(), "bob-run.js");
  const proc = spawn(process.execPath, [wrapperPath, ...args], {
    cwd,
    env: { ...process.env, BOB_CWD: cwd },
    stdio: ["pipe", "pipe", "pipe"],
  }) as ChildProcessWithoutNullStreams;

  console.log(`[bob] spawned pid=${proc.pid} cmd=node ${wrapperPath} ${args.join(" ")} cwd=${cwd}`);

  // Bob waits for stdin to close before starting — close it immediately for headless mode
  proc.stdin.end();

  const session: Session = {
    id: sessionId,
    ...sessionMeta,
    status: "running",
    startedAt: new Date(),
  };

  const handle: ProcessHandle = {
    proc,
    session,
    lines: [],
    subscribers: new Set(),
  };

  handles.set(sessionId, handle);

  // Buffer partial lines from stdout
  let stdoutBuf = "";
  proc.stdout.on("data", (chunk: Buffer) => {
    stdoutBuf += chunk.toString();
    const lines = stdoutBuf.split("\n");
    stdoutBuf = lines.pop() ?? "";
    for (const line of lines) {
      const text = line.trim();
      if (!text) continue;
      try {
        const msg = JSON.parse(text);
        if (msg.type === "message" && msg.content) {
          const prefix = msg.role === "assistant" ? "[bob] " : "";
          pushLine(handle, `${prefix}${msg.content}`);
        } else if (msg.type === "result") {
          const status = msg.status === "success" ? "completed" : msg.status;
          pushLine(handle, `[task ${status}${msg.stats?.duration_ms ? ` in ${(msg.stats.duration_ms / 1000).toFixed(1)}s` : ""}]`);
        }
      } catch {
        pushLine(handle, text);
      }
    }
  });

  // Buffer partial lines from stderr
  let stderrBuf = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString();
    const lines = stderrBuf.split("\n");
    stderrBuf = lines.pop() ?? "";
    for (const line of lines) {
      const text = line.trim();
      if (text) pushLine(handle, text);
    }
  });

  proc.on("close", (code) => {
    console.log(`[bob] process pid=${proc.pid} closed code=${code}`);
    handle.session.status = "done";
    updateSessionStatus(sessionId, "done");
    pushLine(handle, `[process exited with code ${code ?? "—"}]`);
  });

  proc.on("error", (err) => {
    console.log(`[bob] process error pid=${proc.pid}: ${err.message}`);
    handle.session.status = "done";
    updateSessionStatus(sessionId, "done");
    pushLine(handle, `[spawn error: ${err.message}]`);
  });
}

/** Returns the in-memory handle for a session, or undefined. */
export function getHandle(sessionId: string): ProcessHandle | undefined {
  return handles.get(sessionId);
}

// ─── LiveBobProvider ──────────────────────────────────────────────────────────

export class LiveBobProvider implements SessionProvider {
  constructor(private readonly sessionId: string) {}

  // These are intentionally minimal — the composite provider delegates the
  // project/session list to MockSessionProvider; Live only overrides the
  // single live session.

  async listProjects(): Promise<Project[]> {
    return [];
  }

  async getProject(_id: string): Promise<Project | undefined> {
    return undefined;
  }

  async listSessions(_projectId: string): Promise<Session[]> {
    return [];
  }

  async getSession(id: string): Promise<Session | undefined> {
    if (id !== this.sessionId) return undefined;
    const h = handles.get(id);
    if (!h) return undefined;
    return { ...h.session };
  }

  /**
   * Async-iterable of ALL buffered lines, then live lines as they arrive.
   * The iterator ends when the child process exits (status becomes "done")
   * and no new lines are expected.
   */
  async *streamLogs(sessionId: string): AsyncIterable<LogLine> {
    if (sessionId !== this.sessionId) return;

    const h = handles.get(sessionId);
    if (!h) return;

    // First yield all already-buffered lines
    for (const line of h.lines) {
      yield line;
    }

    // If process is already done, nothing more to stream
    if ((h.session.status as string) === "done") return;

    // Subscribe for new lines; yield them via a push-queue
    let resolve: ((v: LogLine | null) => void) | null = null;
    const queue: LogLine[] = [];

    function push(line: LogLine) {
      queue.push(line);
      if (resolve) {
        const r = resolve;
        resolve = null;
        r(queue.shift()!);
      }
    }

    h.subscribers.add(push);

    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
          continue;
        }

        // Wait for next push or done
        if ((h.session.status as string) === "done") break;

        const next = await new Promise<LogLine | null>((r) => {
          // Timeout to re-check done status if no new lines arrive
          const t = setTimeout(() => {
            if (resolve === r) {
              resolve = null;
              r(null);
            }
          }, 500);
          resolve = (v) => { clearTimeout(t); r(v); };
        });

        if (next !== null) yield next;
        if ((h.session.status as string) === "done" && queue.length === 0) break;
      }
    } finally {
      h.subscribers.delete(push);
    }
  }

  async sendInput(sessionId: string, text: string): Promise<void> {
    if (sessionId !== this.sessionId) return;

    const h = handles.get(sessionId);
    if (!h) throw new Error(`No live process for session ${sessionId}`);
    if (h.session.status === "done") throw new Error("Process has already exited");

    h.proc.stdin.write(text + "\n");
    h.session.status = "running";
    updateSessionStatus(sessionId, "running");
  }
}
