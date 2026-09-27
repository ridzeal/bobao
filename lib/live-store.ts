/**
 * LiveProjectStore
 * ─────────────────
 * Pure in-memory store for projects and sessions.
 * No mock data — everything is created at runtime via the UI or API.
 *
 * Uses globalThis to survive Next.js hot-reload module re-evaluation in dev.
 */

import { Project, ProjectStatus, Session, SessionStatus } from "./types";

// ─── Singleton state anchored to globalThis ───────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __agentOpsStore: {
    projects: Map<string, Project>;
    sessions: Map<string, Session>;
    projectCounter: number;
    sessionCounter: number;
  } | undefined;
}

if (!globalThis.__agentOpsStore) {
  globalThis.__agentOpsStore = {
    projects: new Map(),
    sessions: new Map(),
    projectCounter: 0,
    sessionCounter: 0,
  };
}

const store = globalThis.__agentOpsStore;

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export function createProject(
  name: string,
  description: string,
  previewUrl?: string,
): Project {
  store.projectCounter += 1;
  const id = `proj-${store.projectCounter}`;
  const project: Project = {
    id,
    name,
    description,
    status: "idle",
    sessionCount: 0,
    lastUpdated: new Date(),
    previewUrl,
  };
  store.projects.set(id, project);
  return project;
}

export function getProject(id: string): Project | undefined {
  return store.projects.get(id);
}

export function listProjects(): Project[] {
  return Array.from(store.projects.values()).sort(
    (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime(),
  );
}

/** Recompute project status from its sessions and update lastUpdated. */
export function refreshProjectStatus(projectId: string): void {
  const project = store.projects.get(projectId);
  if (!project) return;

  const projectSessions = listSessions(projectId);
  let status: ProjectStatus = "idle";
  if (projectSessions.some((s) => s.status === "blocked")) status = "blocked";
  else if (projectSessions.some((s) => s.status === "running")) status = "active";

  project.status = status;
  project.sessionCount = projectSessions.length;
  project.lastUpdated = new Date();
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

export function createSession(
  projectId: string,
  title: string,
  previewUrl?: string,
): Session {
  store.sessionCounter += 1;
  const id = `sess-${projectId}-${store.sessionCounter}`;
  const session: Session = {
    id,
    projectId,
    harness: "Bob CLI",
    status: "running",
    startedAt: new Date(),
    title,
    previewUrl,
  };
  store.sessions.set(id, session);
  refreshProjectStatus(projectId);
  return session;
}

export function getSession(id: string): Session | undefined {
  return store.sessions.get(id);
}

export function listSessions(projectId: string): Session[] {
  return Array.from(store.sessions.values())
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export function updateSessionStatus(id: string, status: SessionStatus): void {
  const session = store.sessions.get(id);
  if (!session) return;
  session.status = status;
  refreshProjectStatus(session.projectId);
}
