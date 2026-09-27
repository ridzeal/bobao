/**
 * POST /api/sessions/[id]/spawn
 *
 * Body (JSON):
 *   {
 *     args: string[];   // argv passed directly to the `bob` binary
 *     cwd:  string;     // working directory for the child process
 *     // optional Session metadata fields
 *     projectId?: string;
 *     title?:     string;
 *     previewUrl?: string;
 *   }
 *
 * Spawns a `bob` child process and registers it in the in-memory handle map.
 * If a process already exists for this session it is replaced.
 *
 * Returns 200 on success, 400 on bad input.
 */

import { NextRequest, NextResponse } from "next/server";
import { spawnBobProcess } from "@/lib/live-bob-provider";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionId = params.id;

  let body: {
    args?: unknown;
    cwd?: unknown;
    projectId?: unknown;
    title?: unknown;
    topic?: unknown;
    previewUrl?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { args, cwd, projectId, title, topic, previewUrl } = body;

  if (!Array.isArray(args) || typeof cwd !== "string") {
    return NextResponse.json(
      { error: "`args` (array) and `cwd` (string) are required" },
      { status: 400 },
    );
  }

  spawnBobProcess(
    sessionId,
    args as string[],
    cwd,
    {
      projectId: typeof projectId === "string" ? projectId : "live",
      harness: "Bob Shell",
      title: typeof title === "string" ? title : sessionId,
      topic: typeof topic === "string" ? topic : "",
      previewUrl: typeof previewUrl === "string" ? previewUrl : undefined,
    },
  );

  return NextResponse.json({ ok: true, sessionId });
}
