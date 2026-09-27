/**
 * POST /api/sessions/[id]/input
 *
 * Body (JSON):
 *   { text: string }   // text to write to the child process stdin
 *
 * Writes `text + "\n"` to the bob process stdin and flips status back to
 * `running` so the blocked banner disappears on the next page load / SSE poll.
 *
 * Returns 404 when no live process exists for the session.
 * Returns 409 when the process has already exited.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHandle } from "@/lib/live-bob-provider";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionId = params.id;
  const handle = getHandle(sessionId);

  if (!handle) {
    return NextResponse.json(
      { error: "No live process for session " + sessionId },
      { status: 404 },
    );
  }

  if (handle.session.status === "done") {
    return NextResponse.json(
      { error: "Process has already exited" },
      { status: 409 },
    );
  }

  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text } = body;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "`text` (non-empty string) is required" },
      { status: 400 },
    );
  }

  handle.proc.stdin.write(text + "\n");
  handle.session.status = "running";

  return NextResponse.json({ ok: true });
}
