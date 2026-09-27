"use server";

import { defaultProvider } from "@/lib/session-provider";

export async function sendInputAction(sessionId: string, text: string) {
  await defaultProvider.sendInput(sessionId, text);
}
