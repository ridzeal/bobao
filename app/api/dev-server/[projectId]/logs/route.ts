import { NextResponse } from "next/server";
import { getDevServerLogs } from "@/lib/dev-server";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } },
) {
  const url = new URL(req.url);
  const lines = parseInt(url.searchParams.get("lines") ?? "200", 10);
  const logs = getDevServerLogs(params.projectId, lines);
  return NextResponse.json({ logs });
}
