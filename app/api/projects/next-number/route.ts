import { NextResponse } from "next/server";
import { getNextProjectNumber } from "@/lib/live-store";

export async function GET() {
  return NextResponse.json({ number: getNextProjectNumber() });
}
