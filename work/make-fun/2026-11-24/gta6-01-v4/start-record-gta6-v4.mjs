// start-record-gta6-v4.mjs — starts the gta6-01 v4 recorder in the background.
// Reads the API key file at runtime; the key is passed to the recorder child
// only via its environment, never printed or logged. The recorder is detached
// (own process group) with stdout/stderr redirected to the log file, so it
// survives this launcher exiting. Pid file under ~/.makefun, as the kit documents.
import { readFileSync, writeFileSync, mkdirSync, openSync } from 'node:fs';
import { spawn } from 'node:child_process';

const HOME = '/home/hatch';
const WORK = `${HOME}/workspace/make-fun/2026-11-24/gta6-01-v4`;
const KEY = JSON.parse(readFileSync(`${HOME}/workspace/make-fun/.makefun-api-key.json`, 'utf8')).key;

mkdirSync(`${HOME}/.makefun`, { recursive: true });
const logFd = openSync(`${HOME}/.makefun/record-gta6-01-v4.log`, 'a');

const child = spawn('node', [
  `${WORK}/kit/cli/makefun.mjs`, 'record',
  '--competition', 'gta6-01',
  '--source', `${WORK}/build`,
  '--muse-usage', `${HOME}/.makefun/muse-usage-gta6-01-v4.jsonl`,
], {
  cwd: WORK,
  detached: true,
  stdio: ['ignore', logFd, logFd],
  env: { ...process.env, MAKEFUN_API_KEY: KEY },
});

writeFileSync(`${HOME}/.makefun/record-gta6-01-v4.pid`, String(child.pid));
child.unref();
console.log('recorder started, pid', child.pid);
