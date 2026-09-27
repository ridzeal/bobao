/**
 * POST /api/projects
 *
 * Body (JSON):
 *   { name: string; description?: string; previewUrl?: string }
 *
 * Creates a new project in the in-memory store.
 * Returns the created project.
 */

import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/live-store";

export async function POST(req: NextRequest) {
  let body: { name?: unknown; description?: unknown; previewUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description, previewUrl } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "`name` (non-empty string) is required" },
      { status: 400 },
    );
  }

  const project = createProject(
    name.trim(),
    typeof description === "string" ? description.trim() : "",
    typeof previewUrl === "string" ? previewUrl.trim() : undefined,
  );

  return NextResponse.json(project, { status: 201 });
}
