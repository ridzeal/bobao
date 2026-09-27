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
 * POST /api/sessions/[id]/input   → sendFollowUp()      — spawns `bob run -r <taskId>`
 *
 * `bob run` is one-shot: the child exits when its task completes. Follow-ups
 * therefore spawn a NEW `bob run -r <taskId> "<text>"` which resumes the same
 * bob task (full conversation history) — the child is not kept alive.
 */

import { spawn, execFile, ChildProcessWithoutNullStreams } from "child_process";
import { createInterface } from "readline";
import type { Session, SessionStatus, LogLine, Project } from "./types";
import {
  updateSessionStatus,
  insertLog,
  getSession,
  getProject,
  getLogs,
  getSessionTaskId,
  updateSessionTaskId,
} from "./live-store";

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
  /** Working directory of the run — reused for resume runs */
  cwd: string;
  /** Bob task id from the `result` message — used for `-r` resume runs */
  taskId?: string;
  /**
   * Resume runs replay all prior user messages before the new content.
   * Set to the follow-up text so replayed history is dropped from the log
   * (we already pushed a synthetic `[you]` line for it).
   */
  skipUntil?: string;
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

function pushLine(handle: ProcessHandle, text: string, isAssistantMessage = false): void {
  // Never treat structured assistant messages as blocking prompts — they are
  // conversational content, not interactive stdin prompts.
  const level = isAssistantMessage ? classifyLine(text.replace(/\?/g, "")) : classifyLine(text);
  const line: LogLine = { ts: new Date(), text, level: isAssistantMessage && level === "prompt" ? "info" : level };
  handle.lines.push(line);
  insertLog(handle.session.id, line.ts, line.text, line.level ?? "info");

  // Flip to blocked when a prompt-level line appears and session is running
  if (line.level === "prompt" && handle.session.status === "running") {
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
 * Wire a child process's stdio + lifecycle into an existing handle.
 * Used both for the initial run and for `-r` resume runs (follow-ups),
 * so every run appends to the same handle.lines / SSE subscribers.
 */
function attachProcess(handle: ProcessHandle, proc: ChildProcessWithoutNullStreams): void {
  handle.proc = proc;
  // Bob headless mode reads stdin until EOF before starting — close it (input
  // follow-ups do NOT go via stdin; they spawn a new `bob run -r <taskId>`).
  proc.stdin.end();

  // Buffer partial lines from stdout
  let stdoutBuf = "";
  // Accumulate assistant message chunks into one line
  let assistantBuf = "";
  function flushAssistant(): void {
    if (!assistantBuf) return;
    pushLine(handle, `[bob] ${assistantBuf}`, true);
    assistantBuf = "";
  }
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
          const isAssistant = msg.role === "assistant";
          if (isAssistant) {
            assistantBuf += msg.content;
          } else {
            flushAssistant();
            // Drop replayed history (and bob's echo of our follow-up — we
            // already pushed a synthetic `[you]` line for it)
            if (handle.skipUntil) {
              if (msg.content === handle.skipUntil) handle.skipUntil = undefined;
              continue;
            }
            pushLine(handle, msg.content);
          }
        } else if (msg.type === "result") {
          flushAssistant();
          // Capture task id so follow-ups can resume this task (persisted so
          // resume still works after a server restart)
          if (msg.stats?.task_id) {
            handle.taskId = msg.stats.task_id;
            updateSessionTaskId(handle.session.id, msg.stats.task_id);
          }
          const status = msg.status === "success" ? "completed" : msg.status;
          pushLine(handle, `[task ${status}${msg.stats?.duration_ms ? ` in ${(msg.stats.duration_ms / 1000).toFixed(1)}s` : ""}]`);
        }
      } catch {
        flushAssistant();
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
    flushAssistant();
    console.log(`[bob] process pid=${proc.pid} closed code=${code}`);
    handle.session.status = "done";
    updateSessionStatus(handle.session.id, "done");
    pushLine(handle, `[process exited with code ${code ?? "—"}]`);
  });

  proc.on("error", (err) => {
    console.log(`[bob] process error pid=${proc.pid}: ${err.message}`);
    handle.session.status = "done";
    updateSessionStatus(handle.session.id, "done");
    pushLine(handle, `[spawn error: ${err.message}]`);
  });
}

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

  const session: Session = {
    id: sessionId,
    ...sessionMeta,
    status: "running",
    startedAt: new Date(),
  };

  const handle: ProcessHandle = {
    proc: undefined as unknown as ChildProcessWithoutNullStreams,
    session,
    lines: [],
    subscribers: new Set(),
    cwd,
  };

  handles.set(sessionId, handle);

  const proc = spawnBobChild(args, cwd);
  console.log(`[bob] spawned pid=${proc.pid} args=${args.join(" ")} cwd=${cwd}`);
  attachProcess(handle, proc);
}

/** Spawn the bob wrapper script with extra argv (after `run --format stream-json --trust`). */
function spawnBobChild(args: string[], cwd: string): ChildProcessWithoutNullStreams {
  const wrapperPath = require("path").join(process.cwd(), "bob-run.js");
  return spawn(process.execPath, [wrapperPath, ...args], {
    cwd,
    env: { ...process.env, BOB_CWD: cwd },
    stdio: ["pipe", "pipe", "pipe"],
  }) as ChildProcessWithoutNullStreams;
}

/**
 * Rebuild a process handle from SQLite after a server restart.
 *
 * The in-memory `handles` map is lost on restart, but the session row
 * (task_id, project working dir) and all log lines are persisted — enough to
 * resume the bob task and keep appending to the same log.
 *
 * Throws when the session cannot be resumed (no session / no task id / no
 * working directory).
 */
function restoreHandle(sessionId: string): ProcessHandle {
  const session = getSession(sessionId);
  if (!session) throw new Error(`No live process for session ${sessionId}`);

  const taskId = getSessionTaskId(sessionId);
  if (!taskId) throw new Error("No task to resume yet");

  const cwd = getProject(session.projectId)?.workingDir;
  if (!cwd) throw new Error("Project has no working directory");

  const handle: ProcessHandle = {
    proc: undefined as unknown as ChildProcessWithoutNullStreams,
    session,
    lines: getLogs(sessionId),
    subscribers: new Set(),
    cwd,
    taskId,
  };
  handles.set(sessionId, handle);
  console.log(`[bob] restored handle for ${sessionId} task=${taskId} cwd=${cwd}`);
  return handle;
}

/**
 * Send a follow-up message to a session.
 *
 * `bob run` is one-shot (the process exits when the task completes), so a
 * follow-up spawns a NEW `bob run -r <taskId> "<text>"` which resumes the
 * same bob task with full conversation history. Works after a server restart:
 * the handle is rebuilt from SQLite (logs + persisted task id).
 */
export function sendFollowUp(sessionId: string, text: string): void {
  const handle = handles.get(sessionId) ?? restoreHandle(sessionId);
  if (handle.session.status === "running") throw new Error("Agent is still running");
  if (!handle.taskId) throw new Error("No task to resume yet");

  handle.session.status = "running";
  updateSessionStatus(sessionId, "running");

  // Show the follow-up immediately; skip bob's replay of prior user messages
  pushLine(handle, `[you] ${text}`, true);
  handle.skipUntil = text;

  const proc = spawnBobChild(["-r", handle.taskId!, text], handle.cwd);
  console.log(`[bob] resume pid=${proc.pid} task=${handle.taskId} cwd=${handle.cwd}`);
  attachProcess(handle, proc);
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
    sendFollowUp(sessionId, text);
  }
}
