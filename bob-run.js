#!/usr/bin/env node
// Wrapper that runs bob with proper path resolution in sandboxed Next.js
const { execFileSync } = require('child_process');
const path = require('path');

const bobPath = '/home/linuxbrew/.linuxbrew/bin/bob';
const cwd = process.env.BOB_CWD || process.cwd();
const args = ['run', '--format', 'stream-json', '--trust', ...process.argv.slice(2)];

const result = execFileSync(bobPath, args, {
  cwd,
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe'],
  maxBuffer: 10 * 1024 * 1024,
});
process.stdout.write(result);
