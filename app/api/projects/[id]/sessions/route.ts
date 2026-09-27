/**
 * POST /api/projects/[id]/sessions
 *
 * Body (JSON):
 *   {
 *     title:       string;    // human-readable session title
 *     args:        string[];  // argv forwarded to `bob`
 *     cwd:         string;    // working directory for the bob process
 *     previewUrl?: string;
 *   }
 *
 * 1. Registers a new Session row in the in-memory store.
 * 2. Spawns the `bob` child process via spawnBobProcess.
 * 3. Returns the created Session.
 *
 * Returns 404 when the project does not exist.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, createSession } from "@/lib/live-store";
import { spawnBobProcess } from "@/lib/live-bob-provider";
import fs from "fs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const projectId = params.id;

  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: {
    title?: unknown;
    args?: unknown;
    cwd?: unknown;
    previewUrl?: unknown;
    topic?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, args, cwd, previewUrl, topic } = body;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { error: "`title` (non-empty string) is required" },
      { status: 400 },
    );
  }
  if (!Array.isArray(args)) {
    return NextResponse.json(
      { error: "`args` (array) is required" },
      { status: 400 },
    );
  }
  if (typeof cwd !== "string" || !cwd.trim()) {
    return NextResponse.json(
      { error: "`cwd` (non-empty string) is required" },
      { status: 400 },
    );
  }
  if (typeof topic !== "string" || !topic.trim()) {
    return NextResponse.json(
      { error: "`topic` (non-empty string) is required" },
      { status: 400 },
    );
  }

  // Register session in store first so the UI can navigate to it immediately
  const session = createSession(
    projectId,
    title.trim(),
    topic.trim(),
    typeof previewUrl === "string" ? previewUrl.trim() : undefined,
  );

  // Ensure working directory exists before spawning
  try { fs.mkdirSync(cwd.trim(), { recursive: true }); } catch { /* ignore */ }

  // Spawn the real bob process — topic is the first positional arg
  spawnBobProcess(session.id, [topic.trim(), ...args as string[]], cwd, {
    projectId,
    harness: "Bob CLI",
    title: title.trim(),
    topic: topic.trim(),
    previewUrl: typeof previewUrl === "string" ? previewUrl.trim() : undefined,
  });

  return NextResponse.json(session, { status: 201 });
}
