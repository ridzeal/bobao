/**
 * GET /api/sessions/[id]/stream
 *
 * Server-Sent Events endpoint.  Each event is a JSON-encoded LogLine:
 *   data: {"ts":"<ISO>","text":"...","level":"info"|"warn"|"error"|"prompt"}\n\n
 *
 * The stream:
 *   1. Immediately replays all buffered lines from session start.
 *   2. Then tails live output until the process exits.
 *   3. Sends a final `event: done\ndata: {}\n\n` when the process ends.
 *
 * The existing LogPanel receives these lines via the client-side
 * useLiveStream hook; no component changes required.
 *
 * Returns 404 when no live process is registered for the given session id.
 */

import { NextRequest } from "next/server";
import { getHandle } from "@/lib/live-bob-provider";
import { LogLine } from "@/lib/session-provider";

export const dynamic = "force-dynamic";

function sseEvent(line: LogLine): string {
  return `data: ${JSON.stringify({ ...line, ts: line.ts.toISOString() })}\n\n`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionId = params.id;
  const handle = getHandle(sessionId);

  if (!handle) {
    return new Response(
      JSON.stringify({ error: "No live process for session " + sessionId }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      function enqueue(line: LogLine) {
        try {
          controller.enqueue(new TextEncoder().encode(sseEvent(line)));
        } catch {
          // Client disconnected
        }
      }

      // 1. Replay buffered lines
      for (const line of handle.lines) {
        enqueue(line);
      }

      // 2. If already done, close immediately
      if ((handle.session.status as string) === "done") {
        controller.enqueue(
          new TextEncoder().encode("event: done\ndata: {}\n\n"),
        );
        controller.close();
        return;
      }

      // 3. Subscribe for live lines
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

      handle.subscribers.add(push);

      try {
        while (true) {
          if (queue.length > 0) {
            enqueue(queue.shift()!);
            continue;
          }

          if ((handle.session.status as string) === "done") break;

          const next = await new Promise<LogLine | null>((r) => {
            const t = setTimeout(() => {
              if (resolve === r) { resolve = null; r(null); }
            }, 500);
            resolve = (v) => { clearTimeout(t); r(v); };
          });

          if (next !== null) enqueue(next);
          if ((handle.session.status as string) === "done" && queue.length === 0) break;
        }
      } finally {
        handle.subscribers.delete(push);
      }

      // Drain any remaining queued lines
      for (const line of queue) {
        enqueue(line);
      }

      controller.enqueue(
        new TextEncoder().encode("event: done\ndata: {}\n\n"),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",   // disable nginx buffering if behind a proxy
    },
  });
}
