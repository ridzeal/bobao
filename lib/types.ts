// ─── Shared types ─────────────────────────────────────────────────────────────
// Extracted here to avoid circular imports between session-provider, live-store,
// and live-bob-provider.

export type ProjectStatus = "active" | "idle" | "blocked";
export type SessionStatus = "running" | "blocked" | "done";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  sessionCount: number;
  lastUpdated: Date;
  previewUrl?: string;
  workingDir?: string;
}

export interface Session {
  id: string;
  projectId: string;
  harness: "Bob CLI";
  status: SessionStatus;
  startedAt: Date;
  title: string;
  topic: string;
  previewUrl?: string;
}

export interface LogLine {
  ts: Date;
  text: string;
  level?: "info" | "warn" | "error" | "prompt";
}
