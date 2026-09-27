// ─── Types (re-exported for consumers) ───────────────────────────────────────

export type { ProjectStatus, SessionStatus, Project, Session, LogLine } from "./types";

// ─── Interface ────────────────────────────────────────────────────────────────

import type { Project, Session, LogLine } from "./types";

export interface SessionProvider {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  listSessions(projectId: string): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  streamLogs(sessionId: string): AsyncIterable<LogLine>;
  sendInput(sessionId: string, text: string): Promise<void>;
}

// ─── LiveSessionProvider ──────────────────────────────────────────────────────
// Backed entirely by live-store (in-memory) and live-bob-provider (process I/O).
// No mock data.

import * as store from "./live-store";
import { LiveBobProvider } from "./live-bob-provider";

class LiveSessionProvider implements SessionProvider {
  private getLive(sessionId: string): LiveBobProvider {
    return new LiveBobProvider(sessionId);
  }

  async listProjects() {
    return store.listProjects();
  }

  async getProject(id: string) {
    return store.getProject(id);
  }

  async listSessions(projectId: string) {
    return store.listSessions(projectId);
  }

  async getSession(id: string) {
    return store.getSession(id);
  }

  async *streamLogs(sessionId: string): AsyncIterable<LogLine> {
    yield* this.getLive(sessionId).streamLogs(sessionId);
  }

  async sendInput(sessionId: string, text: string): Promise<void> {
    await this.getLive(sessionId).sendInput(sessionId, text);
  }
}

export const defaultProvider: SessionProvider = new LiveSessionProvider();
