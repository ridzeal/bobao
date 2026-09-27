import { NextRequest, NextResponse } from "next/server";
import { deleteProject } from "@/lib/live-store";

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
