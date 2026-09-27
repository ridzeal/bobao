import { NextResponse } from "next/server";
import { stopDevServer } from "@/lib/dev-server";

export async function POST(
  _req: Request,
  { params }: { params: { projectId: string } },
) {
  const stopped = stopDevServer(params.projectId);
  return NextResponse.json({ ok: true, stopped });
}
