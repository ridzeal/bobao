import { NextRequest, NextResponse } from "next/server";
import { deleteProject, updateProject } from "@/lib/live-store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ok = deleteProject(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: { description?: unknown; previewUrl?: unknown; workingDir?: unknown; devCommand?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fields: { description?: string; previewUrl?: string; workingDir?: string; devCommand?: string } = {};
  if (typeof body.description === "string") fields.description = body.description.trim();
  if (typeof body.previewUrl === "string") fields.previewUrl = body.previewUrl.trim() || undefined;
  if (typeof body.workingDir === "string") fields.workingDir = body.workingDir.trim() || undefined;
  if (typeof body.devCommand === "string") fields.devCommand = body.devCommand.trim() || undefined;

  const updated = updateProject(params.id, fields);
  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
