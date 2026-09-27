/**
 * POST /api/sessions/[id]/input
 *
 * Body (JSON):
 *   { text: string }   // follow-up message
 *
 * `bob run` is one-shot, so a follow-up spawns a new `bob run -r <taskId>`
 * that resumes the same bob task with full conversation history.
 *
 * Returns 400 for bad body, 409 when the agent is still running.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendFollowUp } from "@/lib/live-bob-provider";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionId = params.id;

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

  try {
    sendFollowUp(sessionId, text.trim());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("still running") ? 409 : 404;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true });
}
