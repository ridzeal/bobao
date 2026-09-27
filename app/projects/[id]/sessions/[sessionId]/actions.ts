"use server";

import { defaultProvider } from "@/lib/session-provider";
import {
  startDevServer,
  stopDevServer,
  getDevServerStatus,
} from "@/lib/dev-server";

export async function sendInputAction(sessionId: string, text: string) {
  await defaultProvider.sendInput(sessionId, text);
}

export async function startDevServerAction(
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const project = await defaultProvider.getProject(projectId);
  if (!project) return { ok: false, error: "Project not found" };
  if (!project.devCommand)
    return { ok: false, error: "No dev command configured for this project" };
  if (!project.workingDir)
    return { ok: false, error: "No working directory configured" };

  return startDevServer(projectId, project.devCommand, project.workingDir);
}

export async function stopDevServerAction(
  projectId: string,
): Promise<boolean> {
  return stopDevServer(projectId);
}

export async function devServerStatusAction(
  projectId: string,
): Promise<{ running: boolean; pid?: number }> {
  return getDevServerStatus(projectId);
}
