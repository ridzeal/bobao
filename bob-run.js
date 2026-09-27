#!/usr/bin/env node
// Wrapper that runs bob with proper path resolution in sandboxed Next.js
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env from the project root so BOB_API_KEY and BOB_PATH are available
// when this script is spawned as a child process (Next.js does NOT propagate
// its .env loading into child processes).
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

const bobPath = process.env.BOB_PATH || '/home/linuxbrew/.linuxbrew/bin/bob';
const cwd = process.env.BOB_CWD || process.cwd();
const args = ['run', '--format', 'stream-json', '--trust', ...process.argv.slice(2)];

const result = execFileSync(bobPath, args, {
  cwd,
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe'],
  maxBuffer: 10 * 1024 * 1024,
});
process.stdout.write(result);
