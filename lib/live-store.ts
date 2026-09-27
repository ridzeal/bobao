/**
 * LiveProjectStore — SQLite-backed
 * ─────────────────────────────────
 * Persistent store for projects and sessions.
 * Data survives server restarts via a local SQLite file.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { Project, ProjectStatus, Session, SessionStatus, LogLine } from "./types";

// ─── Singleton DB anchored to globalThis (survives HMR) ──────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __agentOpsDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!globalThis.__agentOpsDb) {
    const dbPath = path.join(process.cwd(), "bob-store.db");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status      TEXT NOT NULL DEFAULT 'idle',
        session_count INTEGER NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL,
        preview_url TEXT,
        working_dir TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL,
        harness     TEXT NOT NULL DEFAULT 'Bob CLI',
        status      TEXT NOT NULL DEFAULT 'running',
        started_at  TEXT NOT NULL,
        title       TEXT NOT NULL,
        topic       TEXT NOT NULL DEFAULT '',
        preview_url TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
      CREATE TABLE IF NOT EXISTS session_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        ts         TEXT NOT NULL,
        text       TEXT NOT NULL,
        level      TEXT NOT NULL DEFAULT 'info',
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
    `);
    // Migrate: add topic column if missing
    const cols = db.prepare("PRAGMA table_info(sessions)").all() as any[];
    if (!cols.some((c) => c.name === "topic")) {
      db.exec("ALTER TABLE sessions ADD COLUMN topic TEXT NOT NULL DEFAULT ''");
    }
    // Migrate: add task_id column if missing (bob task id for `-r` resume runs)
    const cols2 = db.prepare("PRAGMA table_info(sessions)").all() as any[];
    if (!cols2.some((c) => c.name === "task_id")) {
      db.exec("ALTER TABLE sessions ADD COLUMN task_id TEXT");
    }
    // Migrate: add dev_command column to projects if missing
    const projCols = db.prepare("PRAGMA table_info(projects)").all() as any[];
    if (!projCols.some((c) => c.name === "dev_command")) {
      db.exec("ALTER TABLE projects ADD COLUMN dev_command TEXT");
    }
    // Mark stale sessions as done on startup (process handles are in-memory, lost on restart)
    db.exec(`UPDATE sessions SET status = 'done' WHERE status IN ('running', 'blocked')`);
    // Recompute all project statuses
    db.exec(`UPDATE projects SET status = 'idle'`);
    for (const row of db.prepare("SELECT id FROM projects").all() as any[]) {
      const sessRow = db.prepare(
        `SELECT
           SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
           SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
           COUNT(*) AS total
         FROM sessions WHERE project_id = ?`
      ).get(row.id) as any;
      let status: ProjectStatus = "idle";
      if (sessRow?.blocked > 0) status = "blocked";
      else if (sessRow?.running > 0) status = "active";
      db.prepare("UPDATE projects SET status = ?, session_count = ? WHERE id = ?")
        .run(status, sessRow?.total ?? 0, row.id);
    }
    globalThis.__agentOpsDb = db;
  }
  return globalThis.__agentOpsDb;
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as ProjectStatus,
    sessionCount: row.session_count,
    lastUpdated: new Date(row.last_updated),
    previewUrl: row.preview_url ?? undefined,
    workingDir: row.working_dir ?? undefined,
    devCommand: row.dev_command ?? undefined,
  };
}

function rowToSession(row: any): Session {
  return {
    id: row.id,
    projectId: row.project_id,
    harness: row.harness,
    status: row.status as SessionStatus,
    startedAt: new Date(row.started_at),
    title: row.title,
    topic: row.topic ?? "",
    previewUrl: row.preview_url ?? undefined,
  };
}

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export function createProject(
  name: string,
  description: string,
  previewUrl?: string,
  workingDir?: string,
  devCommand?: string,
): Project {
  const db = getDb();
  const counter = (db.prepare("SELECT MAX(CAST(SUBSTR(id, 6) AS INTEGER)) AS n FROM projects").get() as any)?.n ?? 0;
  const num = counter + 1;
  const id = `proj-${num}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO projects (id, name, description, status, session_count, last_updated, preview_url, working_dir, dev_command)
     VALUES (?, ?, ?, 'idle', 0, ?, ?, ?, ?)`
  ).run(id, name, description, now, previewUrl ?? null, workingDir ?? null, devCommand ?? null);

  // Ensure working directory exists
  if (workingDir) {
    try { fs.mkdirSync(workingDir, { recursive: true }); } catch { /* ignore */ }
  }

  return {
    id,
    name,
    description,
    status: "idle",
    sessionCount: 0,
    lastUpdated: new Date(now),
    previewUrl,
    workingDir,
    devCommand,
  };
}

export function getProject(id: string): Project | undefined {
  const row = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id);
  return row ? rowToProject(row) : undefined;
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  db.prepare(
    "DELETE FROM session_logs WHERE session_id IN (SELECT id FROM sessions WHERE project_id = ?)"
  ).run(id);
  db.prepare("DELETE FROM sessions WHERE project_id = ?").run(id);
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateProject(
  id: string,
  fields: { description?: string; previewUrl?: string; workingDir?: string; devCommand?: string },
): Project | undefined {
  const db = getDb();
  const project = getProject(id);
  if (!project) return undefined;

  const sets: string[] = [];
  const vals: unknown[] = [];

  if (fields.description !== undefined) { sets.push("description = ?"); vals.push(fields.description); }
  if (fields.previewUrl !== undefined) { sets.push("preview_url = ?"); vals.push(fields.previewUrl || null); }
  if (fields.workingDir !== undefined) { sets.push("working_dir = ?"); vals.push(fields.workingDir || null); }
  if (fields.devCommand !== undefined) { sets.push("dev_command = ?"); vals.push(fields.devCommand || null); }

  if (sets.length === 0) return project;

  sets.push("last_updated = ?");
  vals.push(new Date().toISOString());
  vals.push(id);

  db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getProject(id)!;
}

export function listProjects(): Project[] {
  const rows = getDb().prepare("SELECT * FROM projects ORDER BY last_updated DESC").all();
  return rows.map(rowToProject);
}

export function getNextProjectNumber(): number {
  const row = getDb().prepare("SELECT MAX(CAST(SUBSTR(id, 6) AS INTEGER)) AS n FROM projects").get() as any;
  return (row?.n ?? 0) + 1;
}

export function getNextSessionNumber(projectId: string): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE project_id = ?").get(projectId) as any;
  return (row?.n ?? 0) + 1;
}

export function refreshProjectStatus(projectId: string): void {
  const db = getDb();
  const row = db.prepare(
    `SELECT
       SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
       SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
       COUNT(*) AS total
     FROM sessions WHERE project_id = ?`
  ).get(projectId) as any;

  let status: ProjectStatus = "idle";
  if (row?.blocked > 0) status = "blocked";
  else if (row?.running > 0) status = "active";

  db.prepare(
    "UPDATE projects SET status = ?, session_count = ?, last_updated = ? WHERE id = ?"
  ).run(status, row?.total ?? 0, new Date().toISOString(), projectId);
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

export function createSession(
  projectId: string,
  title: string,
  topic: string,
  previewUrl?: string,
): Session {
  const db = getDb();
  // Find max numeric suffix among existing sessions for this project
  const prefix = `sess-${projectId}-`;
  const row = db.prepare(
    `SELECT MAX(CAST(SUBSTR(id, ?) AS INTEGER)) AS n FROM sessions WHERE id LIKE ?`
  ).get(prefix.length + 1, `${prefix}%`) as any;
  const num = (row?.n ?? 0) + 1;
  const id = `${prefix}${num}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO sessions (id, project_id, harness, status, started_at, title, topic, preview_url)
     VALUES (?, ?, 'Bob CLI', 'running', ?, ?, ?, ?)`
  ).run(id, projectId, now, title, topic, previewUrl ?? null);

  refreshProjectStatus(projectId);

  return {
    id,
    projectId,
    harness: "Bob CLI",
    status: "running",
    startedAt: new Date(now),
    title,
    topic,
    previewUrl,
  };
}

export function getSession(id: string): Session | undefined {
  const row = getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  return row ? rowToSession(row) : undefined;
}

export function listSessions(projectId: string): Session[] {
  const rows = getDb().prepare(
    "SELECT * FROM sessions WHERE project_id = ? ORDER BY started_at DESC"
  ).all(projectId);
  return rows.map(rowToSession);
}

export function updateSessionStatus(id: string, status: SessionStatus): void {
  const db = getDb();
  const session = getSession(id);
  if (!session) return;

  db.prepare("UPDATE sessions SET status = ? WHERE id = ?").run(status, id);
  refreshProjectStatus(session.projectId);
}

// ─── Bob task id (for `-r` resume runs) ──────────────────────────────────────

export function updateSessionTaskId(id: string, taskId: string): void {
  getDb().prepare("UPDATE sessions SET task_id = ? WHERE id = ?").run(taskId, id);
}

export function getSessionTaskId(id: string): string | undefined {
  const row = getDb().prepare("SELECT task_id FROM sessions WHERE id = ?").get(id) as any;
  return row?.task_id ?? undefined;
}

// ─── Session log persistence ──────────────────────────────────────────────────

export function insertLog(sessionId: string, ts: Date, text: string, level: string): void {
  getDb().prepare(
    "INSERT INTO session_logs (session_id, ts, text, level) VALUES (?, ?, ?, ?)"
  ).run(sessionId, ts.toISOString(), text, level);
}

export function getLogs(sessionId: string): LogLine[] {
  const rows = getDb().prepare(
    "SELECT ts, text, level FROM session_logs WHERE session_id = ? ORDER BY id ASC"
  ).all(sessionId) as any[];
  return rows.map((r) => ({
    ts: new Date(r.ts),
    text: r.text,
    level: r.level as LogLine["level"],
  }));
}
