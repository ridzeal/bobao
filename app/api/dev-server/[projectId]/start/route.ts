import { NextResponse } from "next/server";
import { defaultProvider } from "@/lib/session-provider";
import { startDevServer } from "@/lib/dev-server";

export async function POST(
  _req: Request,
  { params }: { params: { projectId: string } },
) {
  const project = await defaultProvider.getProject(params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!project.devCommand) {
    return NextResponse.json(
      { error: "No dev command configured" },
      { status: 400 },
    );
  }
  if (!project.workingDir) {
    return NextResponse.json(
      { error: "No working directory configured" },
      { status: 400 },
    );
  }

  const result = startDevServer(
    params.projectId,
    project.devCommand,
    project.workingDir,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
