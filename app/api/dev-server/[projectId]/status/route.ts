import { NextResponse } from "next/server";
import { getDevServerStatus } from "@/lib/dev-server";

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } },
) {
  const status = getDevServerStatus(params.projectId);
  return NextResponse.json(status);
}
