#!/usr/bin/env node
/**
 * Runs the API (Express) and the Vite dev server together.
 * Usage: npm run dev
 */
import { spawn } from 'node:child_process';

const children = [];

function run(name, command, args, colour) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  const prefix = `\x1b[${colour}m[${name}]\x1b[0m `;
  const pipe = (stream, target) => {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      for (const line of chunk.split('\n')) {
        if (line.trim()) target.write(prefix + line + '\n');
      }
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${prefix}exited with code ${code}`);
    }
    shutdown();
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 200);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run('api', process.execPath, ['--watch', 'server/index.js'], '36');
run('web', process.execPath, ['node_modules/vite/bin/vite.js'], '35');
