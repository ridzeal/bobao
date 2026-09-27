import { NextResponse } from "next/server";
import { getNextSessionNumber } from "@/lib/live-store";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({ number: getNextSessionNumber(params.id) });
}
