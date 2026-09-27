/**
 * DevServerManager — tmux-backed
 * ───────────────────────────────
 * Each project gets a named tmux session `dev-{projectId}`.
 * Survives Next.js restarts. Output capturable. Clean kill via tmux.
 */

import { execSync } from "child_process";

function sessName(projectId: string): string {
  return `dev-${projectId}`;
}

function tmux(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function tmuxOk(cmd: string): boolean {
  try {
    execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

export interface DevServerStatus {
  running: boolean;
}

export function startDevServer(
  projectId: string,
  command: string,
  cwd: string,
): { ok: boolean; error?: string } {
  const name = sessName(projectId);

  if (tmuxOk(`tmux has-session -t ${name} 2>/dev/null`)) {
    return { ok: false, error: "Dev server already running for this project" };
  }

  try {
    // Create detached tmux session in the project working directory
    tmux(`tmux new-session -d -s ${name} -c ${shellEscape(cwd)} "exec \$SHELL"`);
    // Send the dev command
    tmux(`tmux send-keys -t ${name} ${shellEscape(command)} Enter`);
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Failed to start tmux session" };
  }

  return { ok: true };
}

export function stopDevServer(projectId: string): boolean {
  const name = sessName(projectId);
  if (!tmuxOk(`tmux has-session -t ${name} 2>/dev/null`)) return false;

  try {
    tmux(`tmux kill-session -t ${name}`);
  } catch {
    // Already dead
  }
  return true;
}

export function getDevServerStatus(projectId: string): DevServerStatus {
  const name = sessName(projectId);
  return { running: tmuxOk(`tmux has-session -t ${name} 2>/dev/null`) };
}

export function getDevServerLogs(projectId: string, lines = 200): string {
  const name = sessName(projectId);
  if (!tmuxOk(`tmux has-session -t ${name} 2>/dev/null`)) return "";
  try {
    return tmux(`tmux capture-pane -t ${name} -p -S -${lines}`);
  } catch {
    return "";
  }
}

/** Shell-safe quoting: wraps in single quotes, escaping inner single quotes. */
function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
